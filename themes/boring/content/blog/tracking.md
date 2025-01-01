---
title: "2025 Habit Tracking"
title_slug: "habit-tracking"
date: 2025-01-01T11:50:58-06:00
description: "How I plan on tracking my habits in 2025"
---


Cheers to 2024. As it comes to a close, I look back on how amazing of a year it has been. Some notable moments for me
would include: starting a new job, taking the leap into forming an online book club, connecting more with friends, and
being more active in my own life by going to public events and meetups. I go into 2025 inspired to continue the
momentum, and hopefully write more in my blog. :)

In the same vein, I wish I had some data to quantify what I had done more though. I have scattered notes, git commits,
and memories, but no data. In my pursuit to ever over-engineer my life, I've come up with a system to organize my mental
information and capture what I'm doing with my time.

I have a few reasons for working on this. It would be neat, as a reflection going into 2026, to see the results of my
hard work throughout the year. Knowing I have more tools at my disposal to capture said data, this will likely lead to
me thinking about my time as a resource during my day-to-day. It almost puts more pressure on me to not mindlessly
scroll Hacker News, watch YouTube for hours, or just stew on something for too long.

The system I have is divided up into 4 components:

1. Obsidian
2. Activity Watch
3. Wakatime
4. Manual timer app

Each one of these captures data to insert it in to a Postgres database I have running on my homelab, lovingly named
vector.

#### Obsidian

I've implemented a daily note template using [templater](https://silentvoid13.github.io/Templater/introduction.html) and
piecing together some sections I find useful such as tasks, ideas, and notes. To reflect a bit I have a few daily
questions. In order to keep my Obsidian vault synced across devices I use [syncthing](https://syncthing.net/).

```
# 🌞 <% moment(tp.file.title,'YYYY-MM-DD').format("dddd, MMMM DD, YYYY") %> 🌞

---
# 📋 Tasks 
#tasks 
- [ ] <% tp.file.cursor() %>


# 💡 Ideas
#ideas
- 

# 📝 Notes
#notes
- 


---
### 📅 Daily Questions
##### 🌜 Last night, after work, I...
- 
##### 🙌 One thing I'm excited about right now is...
- 
##### 👎 One thing I'm struggling with today is...
- 

---
tags:: #daily-notes
created: <% tp.file.creation_date() %>

<< [[<% fileDate = moment(tp.file.title, 'YYYY-MM-DD-dddd').subtract(1, 'd').format('YYYY-MM-DD-ddd') %>|Yesterday]] | [[<% fileDate = moment(tp.file.title, 'YYYY-MM-DD-ddd').add(1, 'd').format('YYYY-MM-DD-ddd') %>|Tomorrow]] >>
```

#### Timers

I often find that having a variety of working styles depending on my mood, energy level, and time of day is the most
realistic way of framing work. I generally will do cleaning via a Pomodoro so I can take breaks. Other times, I would
like to completely finish a task or have an unknown end time for something recreational such as playing League of
Legends, which involves a manual timer.

Timers, both Pomodoro and manual, are used for tasks outside of my digital workspace. The manual timer is of my
own [creation](https://github.com/devanbenz/habit-keepr). For the Obsidian Pomodoro timer, I have a copy
of [this one](https://github.com/eatgrass/obsidian-pomodoro-timer) which I've modified to output the data into a
Postgres instance instead of a log file.

#### Wakatime & ActivityWatch

For tasks within my digital workspace, I use [ActivityWatch](https://activitywatch.net/) for window title capture
and [WakaTime](https://wakatime.com/) for IDE capture. ActivityWatch serves its purpose when it comes to reading using
Adobe Reader or Calibre, watching some form of media, and writing in Obsidian. WakaTime is pretty self-explanatory; it
tracks all the coding I do both for work and my personal projects.

In order to pull data from WakaTime, I have a nightly cron job which runs a little Go script I wrote. The Go script
calls the WakaTime API and inserts that data into a Postgres instance. ActivityWatch, on the other hand, is a little
more involved. Since I have multiple computers running ActivityWatch, I need to
use [aw-sync](https://github.com/ActivityWatch/aw-server-rust/blob/master/aw-sync/README.md), which creates a SQLite DB
of all my AW activity on each machine. I have an rsync job running every hour on each machine to sync the DBs on my
server. Finally, there's a Go script that runs nightly which pulls data from the ActivityWatch SQLite DBs, transforms
it, and inserts it into my Postgres instance.

I'm excited to start off the new year. I've put a lot of thought into how best to capture my own time and quantify the
work I do. I'm excited to visualize this data in a way that is meaningful to me. I've already started working on a few
dashboards:

![Screenshot 2025-01-01 at 12.30.43 PM.png](https://s3.amazonaws.com/whateverforever-img/Screenshot%202025-01-01%20at%2012.30.43%E2%80%AFPM.png)

Hope this can inspire others to do the same.

To a great 2025! 
