export abstract class Agent {
  readonly name: string;

  abstract run(input: string): Promise<string>;
  constructor(name: string) {
    this.name = name;
  }
}
