const AWS = require('aws-sdk');

const lambda = new AWS.Lambda();

exports.handler = async (event = {}) => {
  const functionName = event.functionName ?? process.env.TARGET_FUNCTION_NAME;
  const repositoryUri =
    event.repositoryUri ?? process.env.REPOSITORY_URI;
  const imageTag = event.imageTag ?? process.env.IMAGE_TAG;
  const imageUri =
    event.imageUri ??
    (repositoryUri && imageTag ? `${repositoryUri}:${imageTag}` : undefined);

  if (!functionName) {
    throw new Error('Missing target function name. Pass functionName in the event or set TARGET_FUNCTION_NAME.');
  }

  if (!imageUri) {
    throw new Error(
      'Missing image URI. Provide imageUri in the event, or set REPOSITORY_URI and IMAGE_TAG/TAG.'
    );
  }

  console.log(
    `Updating Lambda function ${functionName} to image ${imageUri}...`
  );

  await lambda
    .updateFunctionCode({
      FunctionName: functionName,
      ImageUri: imageUri,
      Publish: true,
    })
    .promise();

  console.log('Update request submitted.');

  return {
    status: 'success',
    functionName,
    imageUri,
    timestamp: new Date().toISOString(),
  };
};
