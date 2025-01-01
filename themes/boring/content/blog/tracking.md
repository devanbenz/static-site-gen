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

![Screenshot 2025-01-01 at 12.30.43 PM.png](https://whateverforever-img.s3.us-east-1.amazonaws.com/Screenshot%202025-01-01%20at%2012.30.43%E2%80%AFPM.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAY5XIXFXDJTIRFKLY%2F20250101%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250101T183417Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEOv%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJHMEUCICiGhTVvRZDCOMtx8jwpj9AZMEZC6H7QyhjqO9cLdccVAiEA4K8svAt%2FS76szTXrqlJ1nxKdTPgR%2Ffm%2Fii7svazSI0Mq9QIIxP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARACGgw2MTM1OTQ2Mzk4MTQiDGPq%2Bs%2Bx0xCyWIwa4SrJAtHqRXUDtpyu%2F1OHC1IdopSuKWeN6yoKD9jogQiHSw7QFSskwcbikZnzZ06W%2FgZOD2x6Z8hAbOZDRRLtHsSDmXOyjWa%2FjqyG0cbikK0V3rL49f3WCtJDcRdPlY5q9tjpNIDbuGxQ6AKA1xyXQq%2FCjR1YnR0lse1evtcKl8Jch6ZpGmBGhD9Nxwz%2FYDa2%2BKgVs6s50QOaEM%2Bwt3GSJn1fD62amZClg9awFZbr2HzphjXX46tHfCsoZb801wH8Q1YQsh%2B9kOiFIgaNtr23evR7UEmCbZZKZvmB1Q48qexForliBegthhguMjgL0EeJuNjQSYhPaQ%2FWgIiF%2F5U76hDvkSCrJJnI4Gu6Nfj8%2BN864l2eL2sjXzST2t8a%2BaFmpcG78LGrNI1vx2AqlEU6dsC3Qb2iNnng7R6V6Tk3BUf9YEWH5XLZYwggDst7MOOU1rsGOrMCHb492c64RCwI2Dh5066Puge72fHXeJNcO2mfPZHxtY%2FfjNAc1%2FufYrw%2BnHXZVpt2gPp259PuaUnw%2Bphl4MuqWyCQHwuphYefdU51A41RCAERdh9fLQrtgcf%2B3G7Nlx160otrn8Pa8gFsp3F8oFp1FQJuRIHc4UVKiUahfKvVhENQKEXdUCtcR1ta9spLFNwiSBZ6YI48B3x%2BilyLy5t%2FRw86bu3y4kTTJaa2BeRpcZrXXNEgwRRvEVZTWuZE5bpocG%2FJY848ZszP5pWkQW4bn0A8SRxMv4Y6JgN6fQ2Z46rfnL24TrnaZw3CGX8W9qRwH8qIgOPRZwfumiaNohC6NdpQjR%2FA4ZyFe%2BgxAVuA2wftRT8OHkzCnCXNgkcwe7kGQlSe3HiM7OL7IuaqBPhIA75U4A%3D%3D&X-Amz-Signature=fb6aae62399df4b4509e9b6bc0dd5ac25f00d681b72ed996ed45b5ed9c775e04&X-Amz-SignedHeaders=host&response-content-disposition=inline)

Hope this can inspire others to do the same.

To a great 2025! 
