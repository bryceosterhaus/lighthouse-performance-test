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
	const dataJson = database.data.lighthouse;

	fs.readFile(__dirname + '/index.ejs', 'utf-8', (err, html) => {
		res.send(
			ejs.render(html, {
				data: JSON.stringify(dataJson.raw),
				desktopScore: dataJson.latest.desktop,
				mobileScore: dataJson.latest.mobile,
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

function build_time_test() {
	if (fs.existsSync(antAllBenchMarkScript)) {
		const initCwd = process.cwd();

		process.chdir(toolsDir);

		run_script('git', ['pull', '--rebase', 'upstream', 'master'], () => {
			run_script('sh', [antAllBenchMarkScript], (output) => {
				let buildTimes = output.match(BUILD_TIME_REGEX);

				if (buildTimes) {
					const dateObj = new Date();

					database.data.build[dateObj.toDateString()] = {
						'clean-repo': buildTimes[0],
						'no-gradle-cache': buildTimes[1],
						'full-cache': buildTimes[2],
					};

					database.write();
				}

				process.chdir(initCwd);
			});
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
