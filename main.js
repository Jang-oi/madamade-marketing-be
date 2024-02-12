import expressApp from './App.js';

import path from 'path';
const __dirname = path.resolve();

import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const {app, Tray, Menu, BrowserWindow} = require('electron/main');

let mainWindow;
let tray

const browserOption = {
    width          : 1720,
    height         : 860,
    minWidth       : 1440,
    minHeight      : 600,
    webPreferences : {
        nodeIntegration: true,
    },
    resizable      : true,
    autoHideMenuBar: true,
    show           : false,
    y              : 0,
    x              : 0,
    title : 'S'
}

const createWindow = async () => {
    mainWindow = new BrowserWindow(browserOption);
    expressApp.listen(3001, () => {
        console.log('Server Start...');
    });
    await mainWindow.loadURL("http://localhost:3001/");
    // mainWindow.webContents.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

function createTray() {
    tray = new Tray(`${__dirname}/resources/app/src/assets/images/Autumn.jpg`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Help',
            click: async () => {
                const manualWindow = new BrowserWindow(browserOption);
                await manualWindow.loadURL('https://thoracic-spring-58d.notion.site/29bb6d7c62584007ad8fa895f5e89973?pvs=4');
                manualWindow.show();
            },
        },
        {
            label: 'Start',
            click: () => {
                mainWindow.show();
            },
        },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Seller Supporter');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });

    mainWindow.on('close', function (event) {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

app.on('ready', () => {
    createWindow();
    createTray();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// macOS 때문에 있음.
app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});