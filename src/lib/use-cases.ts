/**
 * Data for /use-cases/[slug] pages. Slugs MUST match USE_CASE_LINKS in site-config.ts.
 * Copy only claims features that exist in the product (see billing.ts plans, CreateVideoWizard,
 * calendar/competitors/publishing providers). No ratings, user counts or testimonials.
 */

export type FeatureIcon = 'script' | 'scenes' | 'voice' | 'captions' | 'refund' | 'calendar' | 'spy' | 'publish' | 'ratio' | 'hook';

export interface UseCase {
  slug: string;
  title: string; // short name used in cards / related links
  metaTitle: string;
  metaDescription: string;
  h1: string;
  subhead: string;
  steps: { title: string; body: string }[];
  features: { icon: FeatureIcon; title: string; body: string }[];
  audience: string[];
  faqs: { q: string; a: string }[];
}

const PUBLISH_FAQ = {
  q: 'Does Tillercast post to my channels automatically?',
  a: 'Publishing only goes to channels you connect yourself, and only after you approve a video. You can revoke access at any time from the platform’s own security settings. Availability of TikTok, Instagram and Facebook publishing depends on each platform’s app approval, so check the pricing page and your account for what is enabled where you are.',
};

const REFUND_FAQ = {
  q: 'What happens if a render fails?',
  a: 'If a render fails on our side, the credits used for that video are returned to your balance automatically. See the refund policy for the full details.',
};

export const USE_CASES: UseCase[] = [
  {
    slug: 'script-to-video',
    title: 'Script to Video',
    metaTitle: 'Script to Video Generator | Tillercast',
    metaDescription:
      'Paste a script and Tillercast splits it into scenes, adds narration, visuals and word-by-word captions, then renders an MP4 you can review before publishing.',
    h1: 'Turn your script into a finished video',
    subhead:
      'Paste a script or outline. Tillercast breaks it into scenes, matches visuals, records the narration and burns in captions, so you review a draft instead of editing a timeline.',
    steps: [
      { title: 'Paste your script', body: 'Drop in a finished script or a rough outline. Pick vertical (9:16) or horizontal (16:9).' },
      { title: 'Review the scenes', body: 'See the script split into scenes with visual prompts. Re-voice, swap or regenerate any scene.' },
      { title: 'Render and download', body: 'Render a 1080p MP4 with narration and captions, then download it or send it to a connected channel.' },
    ],
    features: [
      { icon: 'script', title: 'Scene-by-scene breakdown', body: 'Your script becomes a storyboard with hooks, visual prompts and timing per scene.' },
      { icon: 'scenes', title: 'Scene editor', body: 'Re-voice a narration line, swap a visual tier or undo a change without regenerating the whole video.' },
      { icon: 'voice', title: 'Studio narration voices', body: 'Neural voices in several English accents, with ElevenLabs voices on higher plans.' },
      { icon: 'captions', title: 'Word-by-word captions', body: 'Captions are timed to the audio and placed inside platform safe zones.' },
      { icon: 'ratio', title: 'Vertical or horizontal', body: 'Export 9:16 for Shorts, Reels and TikTok, or 16:9 for standard YouTube.' },
      { icon: 'refund', title: 'Credits back on failures', body: 'If a render fails on our side, the credits for it are returned automatically.' },
    ],
    audience: ['Creators who already write their own scripts', 'Educators turning lesson notes into short explainers', 'Marketers with a finished product or promo script'],
    faqs: [
      { q: 'Do I need to write a perfect script?', a: 'No. A rough outline works. The script assistant can expand it and you can edit every line before rendering.' },
      { q: 'Can I use my own voice?', a: 'On plans with voice cloning you can create a voice from your own recording, with your consent. Standard plans use the built-in narrator voices.' },
      { q: 'Can I edit scenes after the first render?', a: 'Yes. You can regenerate, re-voice or swap individual scenes and re-compose the final video.' },
      REFUND_FAQ,
      PUBLISH_FAQ,
    ],
  },
  {
    slug: 'article-to-video',
    title: 'Article to Video',
    metaTitle: 'Article to Video Maker | Tillercast',
    metaDescription:
      'Turn a blog post or news article into a short narrated video. Paste the text, let Tillercast draft the script and scenes, then review and render.',
    h1: 'Turn an article into a short video',
    subhead:
      'Paste the text of a blog post, report or news story. Tillercast condenses it into a tight script, adds scenes, narration and captions, and gives you a draft to approve.',
    steps: [
      { title: 'Paste the article text', body: 'Add the text you want summarised and describe the tone and length you want.' },
      { title: 'Approve the script', body: 'Read the condensed script, adjust the hook and key points, and refine it by chat.' },
      { title: 'Render the video', body: 'Choose a format, render, and download an MP4 or send it to a connected channel.' },
    ],
    features: [
      { icon: 'script', title: 'Condensed scripts', body: 'Long text becomes a short script with a hook, a clear body and a closing call to action.' },
      { icon: 'hook', title: 'Hook-first writing', body: 'The first line is written to hold attention, and you can regenerate it as many times as you like.' },
      { icon: 'scenes', title: 'Visual matching', body: 'Each scene gets stock footage or an AI-generated visual that fits the line being spoken.' },
      { icon: 'voice', title: 'Narration in your tone', body: 'Pick a calm, energetic or documentary delivery from the voice catalog.' },
      { icon: 'captions', title: 'Burned-in captions', body: 'Most short-form video is watched without sound, so captions are included by default.' },
      { icon: 'refund', title: 'Credits back on failures', body: 'A failed render returns its credits automatically.' },
    ],
    audience: ['Bloggers who want to repurpose posts for social video', 'Newsletter writers and publishers', 'Teams summarising reports for internal updates'],
    faqs: [
      { q: 'Can I paste a link instead of text?', a: 'Today you paste the article text into the prompt. Check the product for updates on link import before relying on it.' },
      { q: 'Will it copy the article word for word?', a: 'No. It condenses the material into a spoken script. You are responsible for having the right to use the source content.' },
      { q: 'How long can the video be?', a: 'Short-form videos up to a minute are the sweet spot, and longer formats are available in the generator.' },
      REFUND_FAQ,
      PUBLISH_FAQ,
    ],
  },
  {
    slug: 'faceless-youtube-channels',
    title: 'Faceless YouTube Channels',
    metaTitle: 'Faceless YouTube Channel Video Maker | Tillercast',
    metaDescription:
      'Plan, script, voice and render videos for a faceless YouTube channel. Use channel templates, a content calendar and competitor research to keep a steady upload schedule.',
    h1: 'Run a faceless YouTube channel without editing software',
    subhead:
      'Set up a channel profile once, then generate scripted, narrated videos on a schedule. You approve each video before it goes out.',
    steps: [
      { title: 'Set up your channel', body: 'Choose a niche, voice and visual style once so every video stays consistent.' },
      { title: 'Plan your content', body: 'Use templates, the calendar planner and competitor research to decide what to make next.' },
      { title: 'Review and publish', body: 'Approve each render, then publish to your connected YouTube channel or schedule it.' },
    ],
    features: [
      { icon: 'calendar', title: 'Content calendar', body: 'Generate a content plan and schedule videos across days or weeks.' },
      { icon: 'spy', title: 'Competitor Outlier Spy', body: 'Track channels in your niche and find videos that outperform their usual numbers, then write your own original take.' },
      { icon: 'script', title: 'Channel templates', body: 'Start from documentary, explainer and Shorts templates tuned for retention.' },
      { icon: 'voice', title: 'Consistent narrator', body: 'Keep one voice across a whole channel, or clone your own on supported plans.' },
      { icon: 'publish', title: 'YouTube publishing', body: 'Connect your channel with Google sign-in and publish approved videos directly.' },
      { icon: 'refund', title: 'Credits back on failures', body: 'A failed render returns its credits automatically.' },
    ],
    audience: ['Creators building topic channels without appearing on camera', 'Small teams running several channels', 'Anyone who wants a repeatable weekly upload routine'],
    faqs: [
      { q: 'Will my channel be monetised?', a: 'Tillercast does not control monetisation. YouTube reviews each channel against its own policies, including its rules on repetitive or mass-produced content. Add real value, review each video and follow the platform guidelines.' },
      { q: 'Does it make original videos?', a: 'Each video is generated from your prompt and script. Competitor research is for finding topics and hook structures, not for copying someone else’s video.' },
      { q: 'How many channels can I connect?', a: 'It depends on your plan. See the pricing page for the number of connected channels per plan.' },
      REFUND_FAQ,
      PUBLISH_FAQ,
    ],
  },
  {
    slug: 'youtube-shorts-automation',
    title: 'YouTube Shorts Automation',
    metaTitle: 'YouTube Shorts Generator and Scheduler | Tillercast',
    metaDescription:
      'Generate vertical YouTube Shorts with narration and captions, plan them on a calendar, and publish approved videos to your connected channel.',
    h1: 'Make and schedule YouTube Shorts in minutes',
    subhead:
      'Describe a topic and get a vertical, captioned Short with a hook written for retention. Plan a week of them on the calendar and approve each one.',
    steps: [
      { title: 'Describe the topic', body: 'Type an idea or pick a Shorts template. The agent asks about tone and voice, or decides for you.' },
      { title: 'Check the draft', body: 'Review the script and the scenes in 9:16, then refine anything by chat.' },
      { title: 'Schedule or publish', body: 'Publish to your connected YouTube channel now, or place it on the calendar.' },
    ],
    features: [
      { icon: 'ratio', title: '9:16 by default', body: 'Videos render at 1080x1920 H.264 with captions inside the safe zones.' },
      { icon: 'hook', title: 'Hook generator', body: 'Generate several opening lines for a topic with the free YouTube hook tool.' },
      { icon: 'calendar', title: 'Batch scheduling', body: 'Generate a multi-day content plan and schedule the videos in one go.' },
      { icon: 'captions', title: 'Kinetic captions', body: 'Word-by-word captions keep viewers who watch on mute.' },
      { icon: 'publish', title: 'Direct upload', body: 'Approved videos upload to your YouTube channel through the official YouTube API.' },
      { icon: 'refund', title: 'Credits back on failures', body: 'A failed render returns its credits automatically.' },
    ],
    audience: ['Creators growing a Shorts-first channel', 'Brands posting daily educational clips', 'Anyone repurposing long videos into short ideas'],
    faqs: [
      { q: 'How long can a Short be?', a: 'Short-form videos up to about a minute are typical. YouTube decides what counts as a Short, so check its current limits.' },
      { q: 'Is the first upload public?', a: 'Newly connected apps may be limited by YouTube until the app has passed its review. If uploads appear as private, that is a platform restriction, not a bug in your video.' },
      { q: 'Can I pick the voice?', a: 'Yes. Choose from the voice catalog, and clone your own voice on supported plans.' },
      REFUND_FAQ,
      PUBLISH_FAQ,
    ],
  },
  {
    slug: 'tiktok-instagram-reels',
    title: 'TikTok & Instagram Reels',
    metaTitle: 'TikTok and Instagram Reels Video Maker | Tillercast',
    metaDescription:
      'Create vertical videos for TikTok, Instagram Reels and Facebook Reels from one prompt. Review the draft, then publish where platform access is available.',
    h1: 'One prompt, vertical video for every short-form platform',
    subhead:
      'Make a captioned 9:16 video once and send it to the platforms you have connected. You stay in control of what gets posted.',
    steps: [
      { title: 'Create the video', body: 'Start from a prompt or script and render a vertical video with narration and captions.' },
      { title: 'Connect your accounts', body: 'Link the accounts you own, where publishing is available for your plan and region.' },
      { title: 'Approve and post', body: 'Check the preview, set the caption and privacy options, and publish.' },
    ],
    features: [
      { icon: 'ratio', title: 'Safe-zone layout', body: 'Captions are placed to stay clear of each platform’s interface buttons.' },
      { icon: 'publish', title: 'Multi-platform publishing', body: 'Publishing providers for TikTok, Instagram Reels and Facebook Reels, where available on your plan and platform approval.' },
      { icon: 'captions', title: 'Captions by default', body: 'Word-by-word captions are burned in so videos work without sound.' },
      { icon: 'voice', title: 'Narrator voices', body: 'Choose a voice that fits the platform’s tone.' },
      { icon: 'calendar', title: 'Scheduling', body: 'Plan posts on the calendar instead of publishing by hand each time.' },
      { icon: 'refund', title: 'Credits back on failures', body: 'A failed render returns its credits automatically.' },
    ],
    audience: ['Short-form creators posting to more than one platform', 'Social media managers handling several accounts they are authorised to manage', 'Small businesses adding video to their social mix'],
    faqs: [
      { q: 'Which platforms can I publish to today?', a: 'YouTube publishing uses the official YouTube API. TikTok, Instagram and Facebook publishing depend on each platform approving our app, so they may be limited or unavailable at first. Videos you render can always be downloaded and uploaded manually.' },
      { q: 'Will posts be public straight away?', a: 'Platforms can restrict posts from apps that have not completed their review, for example by keeping them private. You will always see the privacy setting before posting.' },
      { q: 'Is AI content labelled?', a: 'Platforms have their own AI-disclosure rules. Tillercast supports adding disclosure labels where the platform provides them, but you remain responsible for labelling your content correctly.' },
      REFUND_FAQ,
      { q: 'Can I connect accounts I do not own?', a: 'Only connect accounts you own or are authorised to manage.' },
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}
