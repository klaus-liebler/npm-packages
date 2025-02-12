
//Damit das folgende funktioniert, ist das folgende erforderlich: https://cloud.google.com/docs/authentication/provide-credentials-adc
import { ApiKeysClient } from "@google-cloud/apikeys";

//TL;TR; gclound CLI installieren, in PowerShell: gcloud auth application-default login
export async function createApiKey(project_id: string='labathome-434220', keyId: string="labathome6550c0") {
    //const project_id = 'labathome-434220'
    //It can only contain lowercase letters, numeric characters, and hyphens. It must start with a letter and cannot have a trailing hyphen. The maximum length is "63" characters
    //const keyId= "labathome6550c0";//strInterpolator(bi.hostname_template, bi);
    
    
    const parent = `projects/${project_id}/locations/global`
  
    // Instantiates a client
    const apikeysClient = new ApiKeysClient();
  
    const [operation] = await apikeysClient.createKey({
      parent,
      key:{
        displayName:keyId,
        restrictions:{
          apiTargets:[{service:"generativelanguage.googleapis.com"}]
        },
  
      },
      keyId
    });
    const [response] = await operation.promise();
    console.log(response);
  
    const iterable = await apikeysClient.listKeysAsync({ parent });
    for await (const response of iterable) {
      console.log(response.restrictions?.apiTargets![0]);
    }
  }