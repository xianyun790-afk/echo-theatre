import cast from '../../config/nia-voices.json';
export const hostVoice=cast.voices.narrator_host;
export function voiceForSpeaker(speaker:string){
 const name=speaker.split('·')[0].trim();
 return Object.values(cast.voices).find(v=>v.role.split('／').includes(name))||hostVoice;
}
