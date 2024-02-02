import {createRequire} from 'module';

const require = createRequire(import.meta.url);
import path from 'path';
import url from 'url';

const __dirname = path.resolve();

const {app, Tray, Menu, BrowserWindow} = require('electron/main')

let mainWindow;
let tray

async function createWindow() {
    mainWindow = new BrowserWindow({
        width         : 800,
        height        : 600,
        webPreferences: {
            nodeIntegration: true,
        },
        resizable: true,
    });

    // await mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    await mainWindow.loadURL("http://localhost:3000/");

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function createTray() {
    tray = new Tray(`${__dirname}/src/assets/images/Autumn.jpg`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
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

    tray.setToolTip('Your App Name');
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

/*
app.whenReady().then(() => {


    const contextMenu = Menu.buildFromTemplate([
        {label: '시작', click : () => {
            console.log('시작')
            }},
        {label: '중지',},
        {label: '종료', click : app.quit},
    ])

    tray.setToolTip('This is my application.')
    tray.setContextMenu(contextMenu)
})
*/
app.on('ready', () => {
    createWindow();
    createTray();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});