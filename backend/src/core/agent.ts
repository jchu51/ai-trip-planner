export abstract class Agent<Output = string> {
  readonly name: string;

  abstract run(input: string): Promise<Output>;
  constructor(name: string) {
    this.name = name;
  }
}
