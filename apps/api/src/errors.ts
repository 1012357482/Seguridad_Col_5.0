/** Error con formato application/problem+json. */
export class HttpProblem extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
  ) {
    super(detail ?? title);
  }
}
