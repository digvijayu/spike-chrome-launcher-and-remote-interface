const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');

(async function () {
  await chromeLauncher.killAll();
  console.clear();

  // launch chrome instance
  // you should be able to see a new chrome window
  const chrome = await chromeLauncher.launch({});
  console.log(`Chrome is launched at port: ${chrome.port} | pid: ${chrome.pid}`);


  // connect with the chrome instance using
  const client = await CDP({
    port: chrome.port
  });
  const { Page, Runtime } = client;

  // enable this to receive the execution context events
  await Runtime.enable();
  await Page.enable();

  const { frameTree } = await Page.getFrameTree();

  let contextId = null;

  Runtime.executionContextCreated(async (args) => {
    if(frameTree.frame.id === args.context.auxData.frameId){ 
      contextId = args.context.id;
    }
  });

  Runtime.executionContextDestroyed((args) => {
    console.log('executionContextDestroyed', args);
  });

  Runtime.executionContextsCleared((args) => {
    console.log('executionContextsCleared', args);
  });

  await Page.navigate({ url: 'https://www.animatedimages.org/' });
  await Page.loadEventFired();


  const hook = (contextId) => {
    console.log('----------');
    console.log('args.context.id', contextId);
    console.log('args.context.id', document.querySelector('[name="q"]'));
    console.log('----------');
    const queryInput = document.querySelector('[name="q"]');
    if(!queryInput){
      return Promise.resolve(queryInput);
    }
    queryInput.value = "love";
    const searchButton = document.querySelector('[name="sa"]');
    searchButton.click();

    return Promise.resolve('Done.');
  }

  const innerOutput = await Runtime.evaluate({
    expression: `(${hook})(${contextId})`,
    // expression: `console.log('inside context created')`,
    silent: false,
    includeCommandLineAPI: true,
    awaitPromise: true,
    contextId: contextId
  });
  
  console.log('innerOutput', innerOutput);
})()
