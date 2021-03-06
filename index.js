/* eslint-disable no-console, no-unused-vars */
const async = require('async');
const minimist = require('minimist');
const { exec } = require('child_process');

const node = 'node_modules\\.bin\\';

const args = minimist(process.argv.slice(2));
const project = args._[0];
const dontDeleteFiles = args.d;

if (!project) {
  console.log('You must specify a path');
  console.log('node index.js /path/to/project');
  process.exit(1);
}

/**
 * Convert JSX to React.createElement
 *
 * @param {*} glob
 * @param {*} next
 */
const cjsxCodeMod = (glob, next) => {
  const command = `${node}cjsx-codemod.cmd ${glob}`;

  console.log();
  console.log('$', command);
  console.log();

  const cmd = exec(command);

  cmd.stdout.pipe(process.stdout);
  cmd.stderr.pipe(process.stderr);

  cmd.on('exit', next);
};

/**
 * Convert Coffee to JS
 *
 * @param {*} glob
 * @param {*} next
 */
const decaffeinate = (glob, next) => {
  const options = [
    '--use-optional-chaining',
    '--loose',
    '--disable-babel-constructor-workaround',
    '--disallow-invalid-constructors',
  ];
  const command = `${node}decaffeinate ${glob} ${options.join(' ')}`;

  console.log();
  console.log('$', command);
  console.log();

  const cmd = exec(command);

  cmd.stdout.pipe(process.stdout);
  cmd.stderr.pipe(process.stderr);

  cmd.on('exit', next);
};

/**
 * Run ESLint --fix and Prettier
 *
 * @param {*} glob
 * @param {*} next
 */
const eslintFix = (glob, next) => {
  const command = `${node}eslint --fix ${glob}`;

  console.log();
  console.log('$', command);
  console.log();

  const cmd = exec(command);

  cmd.stdout.pipe(process.stdout);
  cmd.stderr.pipe(process.stderr);

  cmd.on('exit', next);
};

/**
 * Run only Prettier
 *
 * @param {*} glob
 * @param {*} next
 */
const prettier = (glob, next) => {
  const command = `${node}prettier --write ${glob}`;

  console.log();
  console.log('$', command);
  console.log();

  const cmd = exec(command);

  cmd.stdout.pipe(process.stdout);
  cmd.stderr.pipe(process.stderr);

  cmd.on('exit', next);
};

/**
 * Delete files
 *
 * @param {*} glob
 * @param {*} next
 */
const deleteFiles = (glob, next) => {
  if (dontDeleteFiles) {
    next();
    return;
  }

  const command = `${node}rimraf "${glob}"`;

  console.log();
  console.log('$', command);
  console.log();

  const cmd = exec(command);

  cmd.stdout.pipe(process.stdout);
  cmd.stderr.pipe(process.stderr);

  cmd.on('exit', next);
};

/**
 * Run a code mod
 *
 * @param {*} script
 * @param {*} glob
 * @param {*} next
 */
const runJSCodeShift = (script, glob, next) => {
  const command = `${node}jscodeshift -t ${script} ${glob}`;

  console.log();
  console.log('$', command);
  console.log();

  const cmd = exec(command);

  cmd.stdout.pipe(process.stdout);
  cmd.stderr.pipe(process.stderr);

  cmd.on('exit', next);
};

// Run all transformations
const steps = [
  next => cjsxCodeMod(project, next),
  next => decaffeinate(project, next),
  next => runJSCodeShift('decaffenaite-codemods\\remove-coffee-from-imports.js', project, next),
  next => runJSCodeShift('react-codemod\\transforms\\class.js', project, next),
  next => runJSCodeShift('react-codemod\\transforms\\create-element-to-jsx.js', project, next),
  next => runJSCodeShift('js-codemod\\transforms\\arrow-function.js', project, next),
  next => runJSCodeShift('js-codemod\\transforms\\template-literals.js', project, next),
  next => runJSCodeShift('js-codemod\\transforms\\no-vars.js', project, next),
  next => runJSCodeShift('js-codemod\\transforms\\rm-object-assign.js', project, next),
  next => prettier(`${project}/**/*.js`, next),
  // next => eslintFix(project, next),
  next => deleteFiles(`${project}/**/*.coffee`, next),
];

const next = (err, stderr) => {
  console.log();

  if (err) {
    console.log('⛔️', ' ERR!', err);
    console.log();
    console.log(stderr);
    console.log();
    process.exit(1);
  }

  console.log('✅', ' Success!');
};

async.series(steps, next);
