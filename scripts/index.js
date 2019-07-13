const Github = require('@octokit/rest');
const fs = require('fs-extra');
const path = require('path');
const { key } = require('./config');

const noop = () => {};

const github = new Github({
  auth: key,
  baseUrl: 'https://api.github.com',
  log: {
    debug: noop,
    info: noop,
    warn: console.warn,
    error: console.error,
  },
  request: {
    timeout: 0,
  },
});

const runTask = (deps, handle) => {
  const tasks = deps.map(item => handle(item));
  return Promise.all(tasks);
};

const generatePost = item => {
  return `---\r\ndate: ${
    item.created_at
  }\r\ndescription: ""\r\nfeatured_image: ""\r\ntags: [${generateTags(
    item,
  )}]\r\ntitle: "${item.title}"\r\n---\r\n${item.body}`;
};

const generateTags = item => item.labels.map(label => label.name).join(',');

const getAllExistPost = async () => {
  const existPosts = await fs.readdir(
    path.resolve(__dirname, '../content/post'),
  );
  return existPosts.filter(item => !item.includes('_index'));
};

const getNeedPosts = async issues => {
  const existPosts = await getAllExistPost();
  const needPosts = issues.data.filter(item => !existPosts.includes(item.name));
  console.log(`Need post ${needPosts.map(item => `${item.number}.md`)}`);
  return needPosts;
};

const start = async () => {
  try {
    const issues = await github.issues.listForRepo({
      owner: 'topgrd',
      repo: 'blog',
    });

    const needPosts = await getNeedPosts(issues);

    await runTask(needPosts, item => {
      return fs.writeFile(
        path.resolve(__dirname, `../content/post/${item.number}.md`),
        generatePost(item),
        'utf8',
      );
    });

    console.log('All tasks completed');
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  await start();
})();
