import { Datasheet, ParserOptions } from "../types/types";
import { Parser } from "./parser";
import mysql from "mysql2/promise";

export class MySQL extends Parser {
  constructor(config: ParserOptions) {
    super(config);
  }

  async fromDatabase(connectionString: string): Promise<Datasheet[]> {
    const datasheets: Datasheet[] = [];

    const connection = await mysql.createConnection(
      this.config.mysql.connection
    );
    try {
      await this.config.mysql.callback(connection, datasheets);
    } catch (err) {
      console.log(err);
    }

    return datasheets;
  }
}
