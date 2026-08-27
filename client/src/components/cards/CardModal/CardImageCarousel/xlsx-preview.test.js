import { read, utils } from 'xlsx';

import { getXlsxSheetRows, parseXlsxWorkbook } from './xlsx-preview';

jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

describe('XLSX preview parsing', () => {
  test('limits parsed rows and visible columns', () => {
    const workbook = {
      SheetNames: ['Summary'],
      Sheets: { Summary: {} },
    };
    const wideRow = Array.from({ length: 60 }, (_, index) => `cell-${index}`);

    read.mockReturnValue(workbook);
    utils.sheet_to_json.mockReturnValue([wideRow]);

    expect(parseXlsxWorkbook(new ArrayBuffer(8))).toBe(workbook);
    expect(getXlsxSheetRows(workbook, 'Summary')[0]).toHaveLength(50);
    expect(read).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({ dense: true, sheetRows: 200 }),
    );
  });
});
