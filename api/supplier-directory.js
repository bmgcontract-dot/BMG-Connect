import { handleSupplierDirectory, supplierDirectoryServer } from '../src/suppliers/directoryServer.js';

export default function handler(request, response) {
  return handleSupplierDirectory(request, response, args => supplierDirectoryServer()(args));
}
