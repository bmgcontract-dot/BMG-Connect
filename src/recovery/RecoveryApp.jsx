import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import {
  LEGACY_RECOVERY_ORIGIN,
  captureBrowserLegacyCacheSnapshot,
  summarizeLegacySnapshot,
} from './browserLegacyCache.js';
import {
  PRODUCTION_URL,
  getOrCreateRecoveryDeviceId,
  uploadRecoverySnapshot,
} from './recoveryClient.js';
import { initializeRecoveryFirebase } from './recoveryFirebase.js';

const UPLOAD_STAGE_LABELS = {
  preparing: 'กำลังเตรียมและตรวจค่าลับ…',
  initiating: 'กำลังตรวจสิทธิ์และสร้างพื้นที่สำรอง…',
  uploading: 'กำลังอัปโหลด snapshot…',
  verifying: 'กำลังตรวจ checksum จากไฟล์ที่บันทึกแล้ว…',
  complete: 'สำรองข้อมูลสำเร็จ',
};

function Count({ value }) {
  return value === null ? <span className="text-gray-400">ไม่พบ</span> : value.toLocaleString('th-TH');
}

function LoginPanel({ authState, onLogin, busy, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (authState.status === 'loading') {
    return <p className="text-slate-300">กำลังตรวจสถานะการเข้าสู่ระบบ…</p>;
  }
  if (authState.status === 'signed-in') {
    return (
      <div>
        <p className="font-semibold text-emerald-200">เข้าสู่ระบบแล้ว</p>
        <p className="mt-1 text-sm text-slate-300">
          {authState.currentUser?.firstName || authState.currentUser?.username || 'ผู้ใช้งาน'}
          {' — '}{authState.currentUser?.position || 'บัญชี Active'}
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={event => {
        event.preventDefault();
        onLogin(username, password).then(success => {
          if (success) setPassword('');
        });
      }}
    >
      <label className="grid gap-1 text-sm text-slate-300">
        รหัสพนักงาน
        <input
          required
          autoComplete="username"
          value={username}
          onChange={event => setUsername(event.target.value)}
          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-400"
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        รหัสผ่าน
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-400"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="self-end rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
      {error && <p className="text-sm text-red-300 sm:col-span-3">เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจรหัสพนักงานและรหัสผ่าน</p>}
    </form>
  );
}

export default function RecoveryApp() {
  const [{ auth, businessAuth }] = useState(() => initializeRecoveryFirebase());
  const [state, setState] = useState({ status: 'scanning' });
  const [authState, setAuthState] = useState({ status: 'loading' });
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [uploadState, setUploadState] = useState({ status: 'idle' });
  const [receipt, setReceipt] = useState(null);

  const scan = useCallback(async () => {
    setState({ status: 'scanning' });
    try {
      const snapshot = await captureBrowserLegacyCacheSnapshot();
      setState({
        status: 'ready',
        snapshot,
        summary: summarizeLegacySnapshot(snapshot),
      });
    } catch (error) {
      setState({ status: 'error', code: error?.message || 'scan-failed' });
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (!active) return;
      if (!firebaseUser) {
        setAuthState({ status: 'signed-out' });
        return;
      }
      try {
        const currentUser = await businessAuth.restore(firebaseUser);
        if (active) setAuthState({ status: 'signed-in', firebaseUser, currentUser });
      } catch {
        await businessAuth.signOut().catch(() => {});
        if (active) setAuthState({ status: 'signed-out' });
      }
    }, () => {
      if (active) setAuthState({ status: 'error' });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth, businessAuth]);

  const login = async (username, password) => {
    setLoginBusy(true);
    setLoginError('');
    try {
      const result = await businessAuth.signIn(username, password);
      setAuthState({ status: 'signed-in', ...result });
      return true;
    } catch (error) {
      setLoginError(error?.code || 'login-failed');
      return false;
    } finally {
      setLoginBusy(false);
    }
  };

  const backup = async () => {
    if (state.status !== 'ready' || authState.status !== 'signed-in') return;
    setUploadState({ status: 'preparing' });
    try {
      const deviceId = getOrCreateRecoveryDeviceId({
        storage: window.localStorage,
        randomUUID: () => window.crypto.randomUUID(),
      });
      const result = await uploadRecoverySnapshot({
        snapshot: state.snapshot,
        firebaseUser: authState.firebaseUser,
        deviceId,
        onStage: stage => setUploadState({ status: stage }),
      });
      setReceipt(result);
    } catch (error) {
      setUploadState({ status: 'error', code: error?.message || 'backup-failed' });
    }
  };

  const leaveLegacySystem = async () => {
    await businessAuth.signOut().catch(() => {});
    window.location.assign(PRODUCTION_URL);
  };

  const uploadBusy = !['idle', 'error', 'complete'].includes(uploadState.status);
  const canBackup = state.status === 'ready'
    && state.summary.warningCount === 0
    && authState.status === 'signed-in'
    && !uploadBusy;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-orange-400/30 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">BMG-Connect</p>
          <h1 className="text-3xl font-bold sm:text-4xl">สำรองข้อมูลจากระบบเดิม</h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            หน้านี้อ่านข้อมูลจาก Chrome Profile เดิม ตัดรหัสผ่านและ token แล้วเก็บ snapshot
            ไว้ในพื้นที่พักข้อมูล ข้อมูลจะยังไม่ถูกรวมเข้า Production โดยอัตโนมัติ
          </p>
        </div>

        {state.status === 'scanning' && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center">
            กำลังตรวจ Local Storage และ IndexedDB…
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-2xl border border-red-400/40 bg-red-950/40 p-6">
            <h2 className="text-xl font-semibold text-red-200">ไม่สามารถตรวจข้อมูลได้</h2>
            <p className="mt-2 text-red-100">
              {state.code === 'legacy-recovery-origin-required'
                ? `ต้องเปิดหน้านี้จาก ${LEGACY_RECOVERY_ORIGIN} ด้วย Chrome Profile เดิมเท่านั้น`
                : 'ไม่สามารถอ่านพื้นที่เก็บข้อมูลของ Chrome ได้ กรุณาหยุดและติดต่อผู้ดูแลระบบ'}
            </p>
            <button type="button" onClick={scan} className="mt-5 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950">
              ตรวจใหม่
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">กลุ่มข้อมูลที่ตรวจ</p>
                <p className="mt-2 text-3xl font-bold">{state.summary.scannedKeyCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/30 p-5">
                <p className="text-sm text-emerald-200">กลุ่มที่พบข้อมูล</p>
                <p className="mt-2 text-3xl font-bold">{state.summary.foundKeyCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">สำเนาจากพื้นที่จัดเก็บ</p>
                <p className="mt-2 text-3xl font-bold">{state.summary.sourceCopyCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">คำเตือน</p>
                <p className="mt-2 text-3xl font-bold">{state.summary.warningCount}</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              <div className="border-b border-slate-700 px-5 py-4">
                <h2 className="text-xl font-semibold">ข้อมูลที่พบใน Chrome Profile นี้</h2>
              </div>
              {state.summary.datasets.length === 0 ? (
                <p className="p-6 text-slate-300">ไม่พบข้อมูลธุรกิจจากระบบเดิมใน Chrome Profile นี้</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="px-5 py-3">กลุ่มข้อมูล</th>
                        <th className="px-5 py-3">Local Storage</th>
                        <th className="px-5 py-3">IndexedDB</th>
                        <th className="px-5 py-3">ค่าลับที่ตัดออก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.summary.datasets.map(dataset => (
                        <tr key={dataset.key} className="border-t border-slate-800">
                          <td className="px-5 py-3 font-mono text-xs text-orange-200">{dataset.key}</td>
                          <td className="px-5 py-3"><Count value={dataset.localStorageCount} /></td>
                          <td className="px-5 py-3"><Count value={dataset.indexedDbCount} /></td>
                          <td className="px-5 py-3">{dataset.redactedFieldCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold">ยืนยันตัวตนก่อนสำรองข้อมูล</h2>
              <div className="mt-4">
                <LoginPanel authState={authState} onLogin={login} busy={loginBusy} error={loginError} />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-blue-400/30 bg-blue-950/30 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-blue-100">
                  {UPLOAD_STAGE_LABELS[uploadState.status] || 'พร้อมสำรองข้อมูล'}
                </p>
                <p className="mt-1 text-sm text-blue-200">
                  {state.summary.warningCount > 0
                    ? 'พบข้อมูลบางส่วนอ่านไม่ได้ กรุณาหยุดและติดต่อผู้ดูแลก่อนสำรอง'
                    : 'ระบบจะเก็บ snapshot ในพื้นที่พักเท่านั้น ยังไม่รวมเข้าข้อมูลจริง'}
                </p>
                {uploadState.status === 'error' && (
                  <p className="mt-2 text-sm text-red-300">สำรองไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแล ({uploadState.code})</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={scan} disabled={uploadBusy} className="rounded-xl border border-slate-500 px-5 py-3 font-semibold disabled:opacity-50">
                  ตรวจใหม่
                </button>
                <button type="button" onClick={backup} disabled={!canBackup} className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                  {uploadBusy ? 'กำลังสำรอง…' : 'สำรองข้อมูล'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {receipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="recovery-success-title">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-400/40 bg-slate-900 p-7 text-center shadow-2xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-3xl">✓</div>
            <h2 id="recovery-success-title" className="mt-5 text-2xl font-bold">สำรองข้อมูลเรียบร้อยแล้ว</h2>
            <p className="mt-3 text-slate-300">ระบบตรวจ checksum ของไฟล์ที่บันทึกแล้วเรียบร้อย</p>
            <p className="mt-5 rounded-xl bg-slate-950 px-4 py-3 font-mono text-lg text-emerald-300">
              {receipt.receiptCode}
            </p>
            <p className="mt-4 text-sm text-orange-200">กรุณาออกจากระบบเดิม และห้ามกลับมาใช้งานโดเมนเก่า</p>
            <button type="button" onClick={leaveLegacySystem} className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white">
              ออกจากระบบเดิมและไป Production
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

