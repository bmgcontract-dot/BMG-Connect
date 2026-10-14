const text = value => typeof value === 'string' ? value.trim() : '';

// Project/financial/file fields never cross the supplier directory boundary.
export function suppliersFromContracts(contracts) {
  return mergeSupplierDirectory([], contracts.flatMap(contract => {
    const name = text(contract.vendorName);
    if (!name) return [];
    return [{
      id: `auto_${contract.id}`,
      name,
      type: text(contract.type).split(' (')[0],
      category: text(contract.category),
      contact: text(contract.contactPerson) || '-',
      phone: text(contract.contactPhone) || '-',
      email: '-',
      status: 'Active',
      isAuto: true,
    }];
  }));
}

export function mergeSupplierDirectory(contractors, suppliers) {
  const merged = new Map();
  for (const supplier of [...contractors, ...suppliers]) {
    const key = text(supplier.name).toLowerCase();
    if (!key) continue;
    if (!merged.has(key)) {
      merged.set(key, { ...supplier });
      continue;
    }
    const existing = merged.get(key);
    for (const field of ['contact', 'phone']) {
      if ((!existing[field] || existing[field] === '-') && supplier[field] && supplier[field] !== '-') {
        existing[field] = supplier[field];
      }
    }
  }
  return [...merged.values()];
}
