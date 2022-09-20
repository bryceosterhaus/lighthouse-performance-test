const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const desktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');
const mobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config.js');

const URL = 'http://localhost:8080';

const dateObj = new Date();
const month = dateObj.getUTCMonth() + 1;
const day = dateObj.getUTCDate();
const year = dateObj.getUTCFullYear();

const dateString = `${year}-${month}-${day}`;

(async () => {
	const chrome = await chromeLauncher.launch({
		startingUrl: URL,
		chromeFlags: ['--headless'],
	});

	const flags = {
		logLevel: 'info',
		output: 'html',
		onlyCategories: ['performance'],
		port: chrome.port,
	};

	const desktopRunner = await lighthouse(URL, flags, desktopConfig);
	const mobileRunner = await lighthouse(URL, flags, mobileConfig);

	const desktopReportHtml = desktopRunner.report;
	const mobileReportHtml = mobileRunner.report;

	fs.mkdirSync(`./reports/${dateString}`, {recursive: true});

	fs.writeFileSync(
		`./reports/${dateString}/desktop-report.html`,
		desktopReportHtml
	);
	fs.writeFileSync(
		`./reports/${dateString}/mobile-report.html`,
		mobileReportHtml
	);

	const desktopScore = desktopRunner.lhr.categories.performance.score * 100;
	const mobileScore = mobileRunner.lhr.categories.performance.score * 100;

	console.log(mobileRunner.lhr.categories);

	console.log('Results:');

	console.table({
		desktop: desktopScore,
		mobile: mobileScore,
	});

	const allData = JSON.parse(fs.readFileSync('./data/main.json'));

	allData[dateString] = {
		desktop: desktopScore,
		mobile: mobileScore,
	};

	fs.writeFileSync('./data/main.json', JSON.stringify(allData));

	await chrome.kill();
})();
