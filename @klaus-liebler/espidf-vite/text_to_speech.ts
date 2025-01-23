import tts from "@google-cloud/text-to-speech"
import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import * as fs from "node:fs"
import path from "node:path";
import { writeFileCreateDirLazy } from "./utils";

/*
  var boardSounds = c.b.board_settings?.speech as Array<FilenameAndSsml> | undefined;
  var boardTypeSounds = c.b.board_type_settings?.speech as Array<FilenameAndSsml> | undefined;
  var appSounds = c.a.app_settings?.speech as Array<FilenameAndSsml> | undefined;
  var sounds = new Array<FilenameAndSsml>().concat(boardSounds ?? [], boardTypeSounds ?? [], appSounds ?? []);
  var expanded_ssml = strInterpolator(e.ssml, [c.b, c.a]);
*/


//Dieser TTS-Client benötigt eine System-Umgebungsvariable "GOOGLE_APPLICATION_CREDENTIALS", die auf den kompletten Pfad einer JSON-Schlüsseldatei verweist
//Der Inhalt dieser Datei lässt sich wie hier beschrieben erzeugen: https://codelabs.developers.google.com/codelabs/cloud-text-speech-node?hl=de#3


export class FilenameAndSsml { constructor(public name: string, public ssml: string) { } }
export async function convertTextToSpeech(sentences: Array<FilenameAndSsml>, targetDirectory:string) {
  const client = new tts.TextToSpeechClient();
  // Construct the request
  for (const e of sentences) {
    const mp3path = path.join(targetDirectory, e.name + ".mp3");
    if (fs.existsSync(mp3path)) {
      continue;
    }
    console.info(`As ${mp3path} does not exist, I try to get it from Google TTS: ${e.ssml}`);
    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { ssml: e.ssml },
      voice: { name: 'de-DE-Neural2-F', languageCode: "de-DE" },
      audioConfig: { audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3, sampleRateHertz: 22050 },
    };
    const [response] = await client.synthesizeSpeech(request);
    writeFileCreateDirLazy(mp3path, response.audioContent as Uint8Array);
    console.info(`File ${mp3path} successfully created and written`);
  }
}

export async function listvoices() {
  const languageCode = "de";
  const client = new tts.TextToSpeechClient();
  const [result] = await client.listVoices({ languageCode });
  const voices = result.voices as google.cloud.texttospeech.v1.IVoice[];
  voices.forEach((voice) => {
    console.log(`${voice.name} (${voice.ssmlGender}): ${voice.languageCodes}`);
  });
}

