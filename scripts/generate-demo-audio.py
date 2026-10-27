"""Build local demo voice assets with the installed macOS system voice. No API calls."""
from pathlib import Path
import subprocess
import tempfile
import argparse

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/audio'
DEST.mkdir(parents=True, exist_ok=True)
LINES = {
 'arrival': '门开了。墙上的旧广播响了，先听听这首童谣。',
 'boundary': '现在仍在第一幕。我们只讨论已经公开的信息，其他角色的私人记忆，需要由本人决定是否讲述。',
 'replay': '我们再听一遍。以录音中的实际内容为准，留意声音，也留意自己的联想。',
 'stool': '先把目光移到餐桌下面。主位下，似乎还藏着一只小木凳。',
 'stool-known': '你们看见凳面灰尘上的手印了。它能说明近期有人触碰过，却还不能说明是谁。',
 'tape': '这里演示许知音主动公开资料。我带来了邀请函附的磁带，它与今晚广播是否同版，还需要比对。目前不足以判断录音的来源或剪接过程。',
 'liang': '钥匙在桌上，先坐吧。广播是谁开的？我没亲眼看见。顾院长说明早会把档案交出来。',
 'numbers': '请以当前广播录音为准。不能仅凭童谣确定在场人数或任何人的身份，我们还需要独立的记录或证词。',
 'hint-tape': '你们已发现童谣和小木凳。可以问问许知音，今晚的广播与她带来的磁带是否相同。',
 'hint-stool': '广播已经响过。你可以重听童谣，或者检查餐桌下面，寻找实物证据。',
 'fallback': '你可以重听童谣，查看餐桌下的小木凳，或问许知音关于磁带的事。这是第一幕的预设对话演示，公司模型尚未接入。',
 'council-lin': '广播里播放了一首童谣。我想先核对录音的来源，不能仅凭歌声判断谁在场。',
 'council-xu': '我带来了邀请函附的磁带。它与今晚广播是否同一版本，还没有完成比对；现在不能断言录音经过剪接。',
 'council-shen': '我想先区分我们听见的内容和自己的联想。熟悉的歌声会唤起记忆，但不能把模糊记忆当成确定事实。',
 'council-zhou': '我没有拍到是谁开启广播。我的镜头不能替任何人证明这件事。现在关于播放者的说法，都还需要证据。',
 'council-cheng': '小木凳上的灰尘被碰过，这值得记录。但仅凭一道手印，不能判断触碰者是谁，也不能确定触碰的准确时间。',
 'council-tang': '看到小木凳，我会想到这里以前住过的孩子。可这是我的联想。凳子矮、手印小，都不能替代对身份的核实。',
 'council-received': '你的陈述已记录。接下来听取其他人的公开观察。',
 'council-boundary': '当前只有第一幕的公开证据。其他人的私人剧本不能代为公开，现在也不足以指认凶手。',
 'council-question-print': '凳面的灰尘有新鲜手印，能说明近期被触碰过。但这条线索没有告诉我们触碰者是谁，也没有给出准确时间。',
 'council-question-tape': '许知音提供了邀请函附的磁带，但还没有完成比对。没有证据确认它与广播相同或不同，也不能断言录音经过剪接。',
 'council-question-numbers': '以当前广播录音为准。童谣本身不能证明在场人数，更不能确认身份。我们需要独立的记录或证词。',
 'council-question-open': '我目前能提供的，是刚才已经公开的观察。我们可以查童谣的来源、手印，或比对磁带与广播；这些证据都还不能确定幕后的人。'
}
parser = argparse.ArgumentParser()
parser.add_argument('--only', nargs='*', choices=LINES.keys())
args = parser.parse_args()
generated = 0
for name, text in LINES.items():
    if args.only is not None and name not in args.only:
        continue
    with tempfile.TemporaryDirectory(prefix='echo-audio-') as td:
        script = Path(td) / 'line.txt'
        script.write_text(text)
        subprocess.run(['say', '-v', 'Tingting', '-r', '145' if name == 'nursery' else '175', '-f', str(script), '-o', str(DEST / (name + '.wav')), '--file-format=WAVE', '--data-format=LEI16@22050'], check=True, capture_output=True)
        generated += 1
print(f'Generated {generated} local WAV files using Tingting (system voice).')
