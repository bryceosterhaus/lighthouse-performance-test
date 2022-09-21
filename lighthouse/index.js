const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');

const desktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');
const mobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config.js');

const URL = 'http://localhost:8080';

const dateObj = new Date();
const month = dateObj.getUTCMonth() + 1;
const day = dateObj.getUTCDate();
const year = dateObj.getUTCFullYear();

const dateString = `${year}-${month}-${day}`;

(async () => {
	console.log('Launching Chrome:');

	const chrome = await chromeLauncher.launch({
		chromeFlags: ['--headless'],
	});

	const remoteInterface = await CDP({port: chrome.port});

	console.log('Waiting for page to load...');

	const {Page, Runtime} = remoteInterface;

	await Page.enable();
	await Runtime.enable();

	Page.navigate({url: URL});

	await Page.loadEventFired();

	const flags = {
		logLevel: 'info',
		output: 'html',
		onlyCategories: ['performance'],
		port: chrome.port,
	};

	console.log('Running Lighthouse Audits:');

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

	allData.latest = {
		desktop: desktopScore,
		mobile: mobileScore,
	};

	allData.raw[dateString] = {
		desktop: desktopScore,
		mobile: mobileScore,
	};

	fs.writeFileSync('./data/main.json', JSON.stringify(allData));

	if (remoteInterface) {
		await remoteInterface.close();
	}

	await chrome.kill();
})();
