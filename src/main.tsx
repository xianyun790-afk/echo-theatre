import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
import './archive-style.css';
import './components/act-two.css';
import './components/act-one-intro.css';
void document.fonts.load('400 16px "Archive Print"','请在熄灯前回家你听见了').then(()=>{
 document.documentElement.dataset.archiveFontReady=String(document.fonts.check('400 16px "Archive Print"','请在熄灯前回家你听见了'));
});
void document.fonts.load('600 28px "Archive Print"','已发现的线索林见秋').then(()=>{
 document.documentElement.dataset.archivePrintReady=String(document.fonts.check('600 28px "Archive Print"','已发现的线索林见秋'));
});
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
