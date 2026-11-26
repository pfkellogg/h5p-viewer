=== AIKellogg Viewer for H5P ===
Contributors: pfkellogg
Tags: h5p, quiz, answers, lms, elearning
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: h5p
Stable tag: 1.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

See every question and answer in the H5P content on a page: its type, its ID, and which answers are right. For course builders and reviewers.

== Description ==

AIKellogg Viewer for H5P is an inspector for the H5P content on your pages. Open any page or lesson that has H5P on it and a small **H5P** button appears in the bottom-right corner, with a badge counting the H5P items it found. Click it for a panel that lists, for each item:

* its **content type** (Multiple Choice, True/False, Fill in the Blanks, Interactive Video, ...) and **H5P ID**
* every **question**, with **every answer**, the correct ones marked
* the questions **inside** other content, such as the ones placed along an **Interactive Video** (with their times)
* the **pages and posts** where the item is used, with links to view or edit them
* its **xAPI coverage**: the xAPI verbs it sends, whether it's scored and reports completion (handy for LMS reporting)

It needs no shortcode, block or template change: once it's active, the button shows on every page that has H5P content, and only there.

**Who sees it:** only logged-in users with a role you allow, administrators by default. Choose the roles under **Settings → AIKellogg Viewer for H5P**. If you allow a learner role (Subscriber, Customer, Student), the settings page warns you: those users would see the correct answers.

Handy for:

* checking a course's quizzes before learners do
* finding which H5P item a page uses, and where else it's used
* answering "what was the right answer?" from a support request
* reviewing translated content against the original

It reads only what's already on the page and in the H5P plugin's own tables. It sends nothing anywhere and loads nothing from other sites.

H5P is a registered trademark of H5P Group. This plugin is independent: it is not made or endorsed by H5P Group.

== Installation ==

1. Install and activate the **H5P** plugin (Interactive Content - H5P) if you haven't.
2. Install **AIKellogg Viewer for H5P** from **Plugins → Add New**, or upload the zip, and activate it.
3. Optional: choose who sees it under **Settings → AIKellogg Viewer for H5P** (administrators by default).
4. Open any page with H5P content while logged in: the **H5P** button is in the bottom-right corner.

== Frequently Asked Questions ==

= I don't see the button =

It shows only on pages that have H5P content, only to logged-in users with an allowed role. Check **Settings → AIKellogg Viewer for H5P**, and that you're logged in with one of those roles.

= Can learners see the answers? =

Not in this viewer, unless you allow their role: its panel, and the REST route behind it, check the same roles. But H5P itself sends every correct answer to each learner's browser, where anyone can read it with the browser's developer tools. This viewer shows you exactly what they can find. To keep the answers on the server, see Secure Answers for H5P, a separate paid plugin: https://aikellogg.com/#/viewer-for-h5p

= Does it work with LMS plugins? =

Yes: it looks at the page, so it works wherever H5P content is shown: LearnDash, LifterLMS, Tutor LMS, LearnPress, Sensei, MasterStudy, or plain pages and posts.

= Which content types does it understand? =

Questions and answers for every H5P type that has right answers: Multiple Choice, Single Choice Set, True/False, Fill in the Blanks, Advanced Fill in the Blanks, Drag and Drop, Drag the Words, Mark the Words, Summary, Flashcards, Dialog Cards, Image Choice, Find the Hotspot, Find Multiple Hotspots, Sort the Paragraphs, Image Sequencing (the right order), Dictation, Crossword, Find the Words, Guess the Answer, Speak the Words, Essay (its keywords and sample answer), Image Pairing and Memory Game, including when they sit inside Interactive Video, Course Presentation, Question Set, Column, Branching Scenario, Accordion, Interactive Book, Game Map or Image Hotspots. Types with no right answers (Questionnaire, Arithmetic Quiz, Timeline) still show their type, ID, title and where they're used.

== Screenshots ==

1. The H5P button, bottom right, with the number of H5P items on the page.
2. The panel: each item's type, ID, questions and answers, the correct ones marked.
3. Questions inside an Interactive Video, with their times.
4. Settings → AIKellogg Viewer for H5P: which roles see it, with a warning for learner roles.

== Changelog ==

= 1.2.0 =
* Every H5P type with right answers is now shown: Drag the Words, Advanced Fill in the Blanks, Image Choice, Essay keywords, Dictation, Sort the Paragraphs, Image Sequencing, Find Multiple Hotspots, Crossword, Find the Words, Guess the Answer, Speak the Words, Dialog Cards, Image Pairing and Memory Game.
* Looks inside Interactive Book, Game Map and Image Hotspots too.
* Find the Hotspot now lists every hotspot and where it is; Fill in the Blanks hides tips and feedback from the answers.

= 1.1.3 =
* New name for the WordPress.org directory: AIKellogg Viewer for H5P (address aikellogg-viewer-for-h5p); text domain to match.

= 1.1.2 =
* Each item is checked for the user asking: they can edit everyone's H5P content, or it's their own, or it's in a post they can read. The "used on" list shows only posts they can read (no private or draft titles), and an edit link only where they can edit.

= 1.1.1 =
* Items secured by Secure Answers for H5P are listed too, marked "Secured": their questions and answers aren't in the page.

= 1.1.0 =
* New name for the WordPress.org directory: Viewer for H5P (was H5P Viewer).
* Fixed: a crash when the saved role setting was empty; it now falls back to administrators.
* Fixed: the server lookup ("Used on" and the item's details) asked H5P's library table for a column it doesn't have, so it always failed.
* Settings accept only roles that exist on the site, and check the user's permission.
* "Used on" no longer lists pages that use a different item whose ID starts with the same digits (5 and 50).
* All text can be translated (text domain viewer-for-h5p).
* Removes its setting when the plugin is deleted.

= 1.0.1 =
* Choose which roles see the viewer.

= 1.0.0 =
* First version.

== Upgrade Notice ==

= 1.2.0 =
Shows the answers of every H5P type that has right answers, also inside Interactive Book, Game Map and Image Hotspots.

= 1.1.0 =
Fixes a crash with an empty role setting. New name: Viewer for H5P.
