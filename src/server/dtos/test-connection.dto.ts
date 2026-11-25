import { Expose } from "class-transformer";

export class TestConnectionDto {
  @Expose()
  ok: boolean;

  @Expose()
  output: string;
}
