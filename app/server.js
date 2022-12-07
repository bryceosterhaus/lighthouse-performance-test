const express = require('express');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const cron = require('node-cron');
const {spawn} = require('child_process');
const serveIndex = require('serve-index');

const database = require('../database');

const port = 3000;
const app = express();

app.get('/', (req, res) => {
	const {lighthouse: lighthouseData} = database.read();

	fs.readFile(__dirname + '/index.ejs', 'utf-8', (err, html) => {
		res.send(
			ejs.render(html, {
				data: JSON.stringify(lighthouseData.raw),
				desktopScore: lighthouseData.latest.desktop,
				mobileScore: lighthouseData.latest.mobile,
			})
		);
	});
});

app.get('/build', (req, res) => {
	const {build: buildData} = database.read();

	fs.readFile(__dirname + '/build.ejs', 'utf-8', (err, html) => {
		res.send(
			ejs.render(html, {
				data: JSON.stringify(buildData),
			})
		);
	});
});

app.use(
	'/files',
	express.static(path.join(__dirname, '..')),
	serveIndex(path.join(__dirname, '..'), {icons: true})
);

let LOG = '';
let task = null;

app.get('/test/lighthouse', function (req, res, next) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.setHeader('Cache-Control', 'no-store');
	res.setHeader('Transfer-Encoding', 'chunked');

	res.write('<h1>Kicking off lighthouse test...</h1>');

	if (!task) {
		task = spawn('sh', ['./run.sh']);
	}

	let log = '';

	setInterval(() => {
		res.write(`<pre>${log}</pre>`);
		log = '';
	}, 500);

	function writeLog(data) {
		log += data;
	}

	writeLog(LOG);

	task.stdout.setEncoding('utf8');
	task.stdout.on('data', function (data) {
		LOG += data;
		writeLog(data);
	});

	task.stderr.setEncoding('utf8');
	task.stderr.on('data', function (data) {
		LOG += data;
		writeLog(data);
	});

	task.on('close', function (data) {
		LOG = '';
		task = null;
		res.end();
	});
});

app.get('/test/build', function (req, res, next) {
	build_time_test();

	res.send('Running build scripts...');
});

app.listen(port, () => {
	console.log(`App listening on port ${port}`);

	// Runs at midnight and noon
	cron.schedule('0 11,23 * * *', () => {
		try {
			run_script('sh', ['./run.sh']);
		} catch (e) {
			console.log('Lighthouse Error: ' + e.toString());
		}
	});

	// Runs at 4am
	cron.schedule('0 4 * * *', () => {
		try {
			build_time_test();
		} catch (e) {
			console.log('Build Error: ' + e.toString());
		}
	});
});

const toolsDir = path.join(__dirname, '..', '..', 'liferay-portal', 'tools');
const antAllBenchMarkScript = path.join(toolsDir, 'ant_all_benchmark.sh');

const BUILD_TIME_REGEX = /\b([\d]+ minutes and [\d]+ seconds)\b/g;

let buildRunning = false;

function build_time_test() {
	if (fs.existsSync(antAllBenchMarkScript) && !buildRunning) {
		const initCwd = process.cwd();

		process.chdir(toolsDir);

		run_script('git', ['reset', '--hard'], () => {
			run_script(
				'git',
				['pull', '--rebase', 'upstream', 'master'],
				() => {
					buildRunning = true;

					run_script('sh', [antAllBenchMarkScript], (output) => {
						let buildTimes = output.match(BUILD_TIME_REGEX);

						if (buildTimes) {
							const dateObj = new Date();

							const data = database.read();

							data.build[dateObj.toDateString()] = {
								'clean-repo': buildTimes[0],
								'no-gradle-cache': buildTimes[1],
								'full-cache': buildTimes[2],
							};

							data.write();
						}

						process.chdir(initCwd);

						buildRunning = false;
					});
				}
			);
		});
	}
}

function run_script(command, args, callback = () => {}) {
	const child = spawn(command, args);

	let allOutput = '';

	child.stdout.setEncoding('utf8');
	child.stdout.on('data', function (data) {
		console.log(data);

		allOutput += data;
	});

	child.stderr.setEncoding('utf8');
	child.stderr.on('data', function (data) {
		console.log(data);

		allOutput += data;
	});

	child.on('close', function (data) {
		console.log('Exit Code: ' + data);

		callback(allOutput);
	});
}
