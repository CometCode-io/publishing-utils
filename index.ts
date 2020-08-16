import { GraphQLClient, gql } from 'graphql-request'
import fs from 'fs';

interface HashnodeArticle {
  title: string,
  contentMarkdown: string
  isRepublished: {
    originalArticleURL: string;
  }
}

function objectify(array: any[][]): object {
  return array.reduce(function(p, c) {
    // @ts-ignore
    p[c[0]] = c[1];
    return p;
  }, {});
}

function readAndProcessFile(filePath: string, fileName: string): Promise<HashnodeArticle> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', function (err,data) {
      if (err) return reject(err)
      const parsed = data.split("---");
      const header = parsed[1];
      const headerKeys = header.split(/\r?\n/).filter(a => a !== ''); // Split by newline and filter outblank lines
      const headerKeyValuePairsArray: any[][] = headerKeys
        .map(a => a.split(":") // Get key value pairs
        .map(b => b.trim()) // Trim white space
        .map(c => c.replace(/['"]+/g, ''))); // Replace any ' or "
      const headerKeyValuePairsObject: any = objectify(headerKeyValuePairsArray)
      const body = parsed[2].replace('"', "");
      console.log(body);
      const url: string = "https://cometcode.io/posts/" + fileName.replace(/\s+/g, '-').toLowerCase().replace('.md', '');
      const hashnodeArticle: HashnodeArticle = {
        title: headerKeyValuePairsObject.title,
        contentMarkdown: body,
        isRepublished: {
          originalArticleURL: url
        }
      }
      resolve(hashnodeArticle)
    });
  });
}

const contentPath = '../CometCode/src/content/posts/';
fs.readdir(contentPath, (err, files) => {
  files.forEach(file => {
    readAndProcessFile(contentPath + file, file).then((a: HashnodeArticle) => {
      postArticle(a).catch(e => console.error(e))
    })
  });
});

async function postArticle(article: HashnodeArticle) {
  const endpoint = 'https://api.hashnode.com'

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      "Authorization": "69ae629c-33e3-4ad1-ad2b-18b51e3a08c0"
    },
  })

  const query = gql`
    mutation {
      createStory(
        input: {
          title: "${article.title}",
          contentMarkdown: "${article.contentMarkdown}"
          isRepublished: {
            originalArticleURL: "${article.isRepublished.originalArticleURL}"
          }
        }
      ) {
        message
        post{
          title
          slug
        }
        success
      }
    }
  `

  const data = await graphQLClient.request(query)
  return JSON.stringify(data, undefined, 2);
}

