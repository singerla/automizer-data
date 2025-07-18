// src/external/DuckDB.ts
import { Datasheet, DataTag, ResultCell, RawResultMeta } from '../types/types';
import { vd } from "../helper";

interface CrossTabResponse {
  success: boolean;
  row_labels: string[];
  column_labels: string[];
  crosstab: {
    [rowLabel: string]: {
      [colLabel: string]: number | string | null;
    };
  };
  row_variable: {
    name: string;
    label: string;
  };
  column_variable: {
    name: string;
    label: string;
  };
  normalize: string | null;
  include_totals: boolean;
}

export class DuckDBConnector {
  private apiUrl: string;
  private apiToken: string;

  constructor(apiUrl: string = 'http://localhost:5000', apiToken: string = process.env.STATISTICS_API_TOKEN || '') {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
  }

  async query(rowVarTag, colVarTag, filePathTag, tags: DataTag[]) {
    if (!rowVarTag || !colVarTag || !filePathTag) {
      console.error("Missing required tag attributes for DuckDB query");
      return [];
    }

    const row_var = rowVarTag.name;
    const col_var = colVarTag.name;
    const file_path = filePathTag.name;

    if (!row_var || !col_var || !file_path) {
      console.error("Missing required tag values for DuckDB query");
      return [];
    }

    try {
      // Fetch data from DuckDB API
      const response = await this.fetchCrossTab(
        file_path,
        row_var,
        col_var,
        true, // include_totals
        '', // normalize
        true, // value labels
        undefined // where_clause
      );

      // Convert the response to a Datasheet
      const datasheet = this.convertToDatasheet(response, tags as any);

      return datasheet;
    } catch (error) {
      console.error("Error querying DuckDB:", error);
      return null;
    }
  }

  /**
   * Fetches cross-tabulation data from the DuckDB API
   */
  async fetchCrossTab(
    filePath: string,
    rowVar: string,
    colVar: string,
    includeTotal: boolean = true,
    normalize: string | null = null,
    useValueLabels: boolean = true,
    whereClause?: string
  ): Promise<CrossTabResponse> {
    try {
      vd({
        analysis_type: 'crossTable',
        file_path: filePath,
        row_var: rowVar,
        col_var: colVar,
        include_totals: includeTotal,
        useValueLabels: useValueLabels,
        normalize: normalize,
        where_clause: whereClause
      })

      const response = await fetch(`${this.apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify({
          analysis_type: 'crossTable',
          file_path: filePath,
          row_var: rowVar,
          col_var: colVar,
          include_totals: includeTotal,
          use_value_labels: useValueLabels,
          normalize: normalize,
          where_clause: whereClause
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DuckDB API error: ${errorData.error || response.statusText}`);
      }

      return await response.json() as CrossTabResponse;
    } catch (error) {
      console.error('Error fetching cross-tab data:', error);
      throw error;
    }
  }

  /**
   * Converts the DuckDB API response to a Datasheet object
   */
  convertToDatasheet(response: CrossTabResponse, tags: DataTag[]): Datasheet {
    // Check if the response is valid
    if (!response.success || !response.crosstab) {
      vd(response)
      throw new Error('Invalid response format from DuckDB API');
    }

    vd(response)

    // Extract row and column labels
    const rowLabels = response.row_labels;
    const columnLabels = response.column_labels;

    // Create row labels with human-readable labels if available
    const rowLabelsWithLabels = rowLabels.map(rowKey => {
      // If it's the "Total" row, just return "Total"
      if (rowKey === 'Total') return 'Total';

      // Try to find a label for this value in the response
      return rowKey;
    });

    // Create column labels with human-readable labels if available
    const columnLabelsWithLabels = columnLabels.map(colKey => {
      // If it's the "Total" column, just return "Total"
      if (colKey === 'Total') return 'Total';

      // Try to find a label for this value in the response
      return colKey;
    });

    // Create the data array
    const dataArray: ResultCell[][] = [];

    rowLabels.forEach((rowLabel, rowKey) => {
      const rowData: ResultCell[] = [];
      const row = response.crosstab[rowKey] || {};

      columnLabels.forEach(colKey => {
        const value = row[colKey] !== undefined ? row[colKey] : null;
        rowData.push(value);
      });

      // Add Total column if include_totals is true
      if (response.include_totals && row['Total'] !== undefined) {
        rowData.push(row['Total']);
      }

      dataArray.push(rowData);
    });

    // If include_totals is true and we have a 'Total' key in the crosstab
    if (response.include_totals && response.crosstab['Total']) {
      const totalRowData: ResultCell[] = [];

      columnLabels.forEach(colKey => {
        const value = response.crosstab['Total'][colKey];
        totalRowData.push(value);
      });

      // Add Total-Total cell
      if (response.crosstab['Total']['Total'] !== undefined) {
        totalRowData.push(response.crosstab['Total']['Total']);
      }

      dataArray.push(totalRowData);
    }

    // Create metadata
    const meta: RawResultMeta[] = [

    ];

    // Add normalize info if present
    if (response.normalize) {

    }

    // Create final datasheet
    return {
      id: Date.now(),
      tags,
      rows: response.include_totals ? [...rowLabelsWithLabels, 'Total'] : rowLabelsWithLabels,
      columns: response.include_totals ? [...columnLabelsWithLabels, 'Total'] : columnLabelsWithLabels,
      data: dataArray,
      meta
    };
  }
}
