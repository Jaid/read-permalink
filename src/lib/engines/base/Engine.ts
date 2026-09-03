export default abstract class Engine {
  abstract readonly aliases: ReadonlySet<string>

  matches(input: string) {
    return this.aliases.has(input)
  }
}
