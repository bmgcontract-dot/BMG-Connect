import React, { useState } from 'react';

export default function LegacyCellReviewPanel({ projectName, month, cells, disabled, onConfirm }) {
  const [choices, setChoices] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = cells.filter(cell => !['reviewed', 'protected'].includes(cell.status));
  const selected = pending.filter(cell => choices[cell.key]).map(cell => ({ key: cell.key, decision: choices[cell.key] }));
  const confirm = async () => {
    if (busy || disabled || !selected.length) return;
    setBusy(true); setMessage('');
    try { await onConfirm(selected); setChoices({}); setMessage('บันทึกการยืนยันแล้ว ช่องที่พักตรวจยังคงเดิม'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="mx-4 my-4 p-4 border border-amber-300 rounded-lg bg-amber-50" aria-label="ตรวจข้อมูลเดิมรายช่อง">
    <h4 className="font-bold">ตรวจข้อมูลเดิมรายช่อง — {projectName} / {month}</h4>
    <p className="text-sm my-2">เลือกยืนยันเฉพาะช่องที่ตรวจชื่อ โครงการ วันที่ และกะถูกต้องแล้ว ช่องที่พักตรวจจะไม่ถูกนำเข้าหรือเปิดแก้ไข การยืนยันไม่เปลี่ยนสถานะอนุมัติ</p>
    <div className="overflow-auto max-h-96"><table className="w-full text-sm bg-white"><thead><tr>
      {['พนักงาน', 'วันที่', 'ประเภท', 'ค่าเดิม', 'ค่าปัจจุบัน', 'ผลตรวจ', 'ยืนยันโครงการและค่า'].map(label => <th className="p-2 border text-left" key={label}>{label}</th>)}
    </tr></thead><tbody>{pending.map(cell => <tr key={cell.key}>
      <td className="p-2 border">{cell.person.employeeId} {cell.person.firstName} {cell.person.lastName}</td>
      <td className="p-2 border">{cell.date}</td><td className="p-2 border">{cell.type}</td>
      <td className="p-2 border">{cell.sourceValue || '(ว่าง)'}</td>
      <td className="p-2 border">{cell.currentPresent ? cell.currentValue || '(ว่าง)' : 'ยังไม่มีข้อมูล'}</td>
      <td className="p-2 border">{{ identical: 'ตรงกัน', missing: 'ขาด', conflict: 'ต่างกัน' }[cell.status]}</td>
      <td className="p-2 border"><select aria-label={`ยืนยัน ${cell.person.employeeId} ${cell.date} ${cell.type}`}
        disabled={disabled || busy} value={choices[cell.key] || ''} onChange={e => setChoices({ ...choices, [cell.key]: e.target.value })}>
        <option value="">พักตรวจ — ยังไม่ยืนยัน</option>
        <option value="import">ยืนยันโครงการ — ใช้ค่าเดิม {cell.sourceValue || '(ว่าง)'}</option>
        {cell.currentPresent && <option value="keep-current">ยืนยันโครงการ — คงค่าปัจจุบัน {cell.currentValue || '(ว่าง)'}</option>}
      </select></td>
    </tr>)}</tbody></table></div>
    <button className="mt-3 px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50" disabled={disabled || busy || !selected.length} onClick={confirm}>
      {busy ? 'รอเซิร์ฟเวอร์ยืนยัน…' : `บันทึกการยืนยัน ${selected.length} ช่อง`}
    </button>
    <p role="status" className="text-sm mt-2">{message}</p>
  </section>;
}
