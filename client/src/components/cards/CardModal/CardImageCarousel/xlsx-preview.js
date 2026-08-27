import { read, utils } from 'xlsx';

export const MAX_XLSX_PREVIEW_ROWS = 200;
export const MAX_XLSX_PREVIEW_COLUMNS = 50;

export const parseXlsxWorkbook = (data) =>
  read(data, {
    dense: true,
    sheetRows: MAX_XLSX_PREVIEW_ROWS,
  });

export const getXlsxSheetRows = (workbook, sheetName) =>
  utils
    .sheet_to_json(workbook.Sheets[sheetName], {
      blankrows: false,
      defval: '',
      header: 1,
      raw: false,
    })
    .map((row) => row.slice(0, MAX_XLSX_PREVIEW_COLUMNS));
