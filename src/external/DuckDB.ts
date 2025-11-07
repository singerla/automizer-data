// src/external/DuckDB.ts

import { vd } from "../helper";
import { RequestCategory } from "../query";
import TagsCache from "../helper/tagsCache";

interface CrossTabResponse {
  success: boolean;
  columns: string[];
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

  constructor(
    apiUrl: string = "http://localhost:5000",
    apiToken: string = process.env.STATISTICS_API_TOKEN || "",
  ) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
  }

  async query(
    variable_name: string,
    split_variable_names: string[],
    requestCategories: RequestCategory[]
  ) {
    const requestIds = {}
    requestCategories.forEach(cat => {
      requestIds[cat.key] = cat.tags.map(tag => tag.code)
    })

    vd({
      variable_name,
      split_variable_names,
      ...requestIds
    })


    try {
      // Fetch data from DuckDB API
      const response = await this.fetchCrossTabs({
        variable_name,
        split_variable_names,
        ...requestIds
      });

      vd("Query took " + response.processing_time_ms + "ms");

      return response.data;
    } catch (error) {
      console.error("Error querying DuckDB:", error);
      return null;
    }
  }

  /**
   * Fetches cross-tabulation data from the DuckDB API
   */
  async fetchCrossTabs(vars: any): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/analyze/count`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify(vars),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `DuckDB API error: ${errorData.error || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching cross-tab data:", error);
      throw error;
    }
  }
}
