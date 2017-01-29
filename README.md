
# FEND-Neighborhood-Map-Project
(5th project for Udacity's Front-End Nanodegree Program.)
 
This project was built on Google App Engine with Knockout.js framework.
It shows popular places in the user defined location.
You can open map/index.html in your local server to see the app. 

#### App Functionality
- The text input field on the top bar filters the map markers and list items to locations matching the text input.
- The list displays all locations by default and displays the filtered subset of locations when a filter is applied.
- Clicking a location on the list displays unique information about the location, and animates its associated map marker.
- Map displays all location markers by default, and displays the filtered subset of location markers when a filter is applied.
- Clicking a marker displays unique information about a location in an infoWindow.
- Markers change color when clicked.

#### App Architecture
- Use Knockout: Code is separated based upon Knockout best practices (follow an MVVM pattern, avoid updating the DOM manually with jQuery or JS, use observables rather than forcing refreshes manually, etc). 
- Application utilizes the Google Maps API and one non-Google third-party API.
- Functionality providing additional data about a location is provided and sourced from a 3rd party API: Foursquare.
- All data requests are retrieved in an asynchronous manner.
