import { spawn } from 'node:child_process';

const children = [];
let shuttingDown = false;

startProcess('server', ['run', 'server']);
startProcess('client', ['run', 'dev']);

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function startProcess(label, args) {
  const command =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
          cwd: process.cwd(),
          env: process.env,
          stdio: ['inherit', 'pipe', 'pipe'],
        })
      : spawn('npm', args, {
          cwd: process.cwd(),
          env: process.env,
          stdio: ['inherit', 'pipe', 'pipe'],
        });
  const child = command;
  children.push(child);

  child.stdout.on('data', (chunk) => {
    writeTaggedOutput(label, chunk);
  });

  child.stderr.on('data', (chunk) => {
    writeTaggedOutput(label, chunk);
  });

  child.on('exit', (code, signal) => {
    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.log(`[${label}] exited with ${detail}`);

    if (!shuttingDown) {
      shuttingDown = true;
      for (const otherChild of children) {
        if (otherChild !== child && !otherChild.killed) {
          otherChild.kill('SIGTERM');
        }
      }
      process.exitCode = code ?? 0;
    }
  });

  child.on('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    shutdown();
  });
}

function writeTaggedOutput(label, chunk) {
  const text = String(chunk);
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line) continue;
    console.log(`[${label}] ${line}`);
  }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}
