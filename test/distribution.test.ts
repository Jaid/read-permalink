import {test} from 'bun:test'
import * as path from 'node:path'

const runCommand = async (command: ReadonlyArray<string>, cwd: string) => {
  const child = Bun.spawn([...command], {
    cwd,
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const stdoutResponse = new Response(child.stdout)
  const stderrResponse = new Response(child.stderr)
  const [stdout, stderr, exitCode] = await Promise.all([
    stdoutResponse.text(),
    stderrResponse.text(),
    child.exited,
  ])
  if (exitCode !== 0) {
    throw new Error([`Command failed: ${command.join(' ')}`, stdout.trim(), stderr.trim()].filter(Boolean).join('\n'))
  }
}
const copyFolder = async (sourceFolder: string, outputFolder: string) => {
  await Bun.$`mkdir -p ${outputFolder}`
  const glob = new Bun.Glob('**/*')
  for await (const relativePath of glob.scan({
    cwd: sourceFolder,
    dot: true,
    onlyFiles: true,
  })) {
    const sourceFile = path.join(sourceFolder, relativePath)
    const outputFile = path.join(outputFolder, relativePath)
    await Bun.$`mkdir -p ${path.dirname(outputFile)}`
    await Bun.write(outputFile, Bun.file(sourceFile))
  }
}
test('built package schema types compile in consumer projects', async () => {
  const workspaceFolder = process.cwd()
  const temporaryRoot = Bun.env.TEMP || Bun.env.TMP || Bun.env.TMPDIR || path.resolve('temp')
  const consumerFolder = path.join(temporaryRoot, `read-permalink-distribution-${crypto.randomUUID()}`)
  const nodeModulesFolder = path.join(consumerFolder, 'node_modules')
  const entryFile = path.join(consumerFolder, 'index.ts')
  await runCommand(['bun', 'run', 'build'], workspaceFolder)
  try {
    await Bun.$`rm -rf ${consumerFolder}`
    await Bun.$`mkdir -p ${nodeModulesFolder}`
    await Promise.all([
      copyFolder('dist/read-permalink/production', path.join(nodeModulesFolder, 'read-permalink')),
      copyFolder('node_modules/optis', path.join(nodeModulesFolder, 'optis')),
    ])
    await Bun.write(entryFile, await Bun.file('test/typecheck.distribution.examples.ts').text())
    for (const [moduleResolution, module] of [['bundler', 'esnext'], ['nodenext', 'nodenext']] as const) {
      await runCommand([
        'bun',
        'x',
        'tsc',
        '--ignoreConfig',
        '--noEmit',
        '--pretty',
        'false',
        entryFile,
        '--lib',
        'esnext,dom',
        '--module',
        module,
        '--moduleResolution',
        moduleResolution,
        '--strict',
        '--target',
        'esnext',
      ], workspaceFolder)
    }
  } finally {
    await Bun.$`rm -rf ${consumerFolder}`
  }
}, {timeout: 30_000})
