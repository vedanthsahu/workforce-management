# Chatbot changes — what happened

This page uses simple, short sentences. It is for any reader, not just engineers.

## What we found

The chatbot feature was built as its own separate program. Later, someone joined it to the main app. But the join was not complete. The chatbot kept its own way to talk to the database. The chatbot kept its own way to check who is logged in. The chatbot also called the main app over the internet, even though it was already part of the same program.

This caused a real problem. Each of these separate parts opened its own line to the database. Under load, the database ran out of free lines. Users saw errors. The app rejected new requests.

## What we changed

**1. The database connection**

Before: the chatbot had its own, separate way to connect to the database.
Now: the chatbot uses the exact same database connection as the rest of the app. One app, one way to connect to the database.

**2. How the chatbot checks who is logged in**

Before: the chatbot made its own temporary login pass for every request. This pass did not check if the user had logged out or lost access.
Now: the chatbot uses the main app's real login check. This is the same check every other part of the app already uses. It is safer. A user who logs out or loses access loses chatbot access too, right away.

**3. How the chatbot books a seat**

Before: the chatbot sent a request over the internet to the main app, to book a seat. This was strange, because the chatbot and the main app are the same program.
Now: the chatbot calls the booking code directly. No request goes out over the internet. This is faster. It also removes one more thing that was filling up the database connections.

## What this means for you

The chatbot works the same way from your side. You type a message. You get a reply. You can still book a seat, see your bookings, cancel a booking, and so on. Nothing about how you use the chatbot has changed.

What changed is behind the scenes. The app is now simpler. It is safer. It should not run out of database connections the same way again.

## What we did not change yet

We found one more thing: a proper, trackable way to update the database structure over time (migrations) exists on a separate, unfinished piece of work. We are not using it yet — it needs a decision on AWS setup first. We left this for later, on purpose.
