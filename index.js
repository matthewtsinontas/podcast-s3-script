const jsonxml = require('jsontoxml');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const AWS = require('aws-sdk');
const rfc822Date = require('rfc822-date');

dotenv.config();

const awsS3Client = new AWS.S3( {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: 'eu-west-2',
    signatureVersion: 'v4'
});

let mp3Filenames;

try {
    mp3Filenames = fs.readdirSync('files');
} catch (e) {
    console.log('ERROR: Cannot find folder. Please create a folder called "files" in the same directory and put your mp3s in there.');
    process.exit(1);
}

const dateTime = rfc822Date(new Date());

const mp3ToXml = mp3Filenames
    .filter(name => name !== 'index.html')
    .map((name) => {
        const url = `http://krispodcastbucket.s3-website.eu-west-2.amazonaws.com/${name}`;
        return {
            item: [
                { name: 'title', text: name.split('.mp3')[0] },
                { name: 'description', text: 'description' },
                { name: 'itunes:summary', text: 'itunes:summary' },
                { name: 'itunes:subtitle', text: 'itunes:subtitle' },
                { name: 'itunesu:category', attrs: { 'itunesu:code': '112'} },
                { name: 'enclosure', attrs: { url, type: 'audio/mpeg', length: '1' } },
                { name: 'guid', text: url },
                { name: 'itunes:duration', text: '0:00:01' },
                { name: 'pubDate', text: dateTime }
            ]
        }
    })

const template = fs.readFileSync('./basexml', 'utf-8');

const newTemplate = template.replace('{{}}', jsonxml(mp3ToXml));

fs.writeFileSync('./files/index.html', newTemplate);

fs.readdirSync('files').forEach((file) => {
    awsS3Client.putObject({
        Bucket: 'krispodcastbucket',
        Key: file,
        Body: fs.readFileSync(path.join(__dirname, 'files', file)),
        ACL: 'public-read'
    }, (res) => {
        console.log(`Successfully uploaded '${file}'`);
    });
});
