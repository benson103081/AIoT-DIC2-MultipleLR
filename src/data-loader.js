// Shared by the browser UI and HTTP/file integration tests.
export async function fetchCSV(url, signal, base=globalThis.location?.href) {
  const parsed=new URL(url,base);
  if(!['https:','http:'].includes(parsed.protocol))throw Error('僅支援 HTTP / HTTPS CSV URL。');
  const response=await fetch(parsed,{signal});
  if(!response.ok)throw Error(`HTTP ${response.status}：來源無法載入。`);
  if(Number(response.headers.get('content-length'))>2_000_000)throw Error('CSV 超過 2 MB 限制。');
  const reader=response.body.getReader();let size=0,text='';
  const decoder=new TextDecoder('utf-8',{fatal:true});
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('CSV 超過 2 MB 限制。');text+=decoder.decode(value,{stream:true});}
    return text+decoder.decode();
  } catch(error){await reader.cancel().catch(()=>{});throw error;}
}
export async function readCSVFile(file) {
  if(file.size>2_000_000)throw Error('CSV 超過 2 MB 限制。');
  return new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
}
