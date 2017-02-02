
# FEND-Neighborhood-Map-Project
(5th project for Udacity's Front-End Nanodegree Program.)
 
This project was built with Knockout.js framework.
It shows popular places in the user defined location.
You can clone the project and open map/index.html in your browser to see the app. 

#### App Functionality
- The list displays all the locations by default and displays the subset of locations when a filter or search is applied.
- Clicking a location on the list animates its associated map marker.
- Map displays all location markers by default, and displays the subset of markers when a filter or search is applied.
- Clicking a marker triggers an infoWindow to display the information for that location.
- Markers change color when clicked.
- User can change the prefered location by clicking settings button.

#### App Architecture
- Use Knockout: code is separated based upon Knockout best practices (follow an MVVM pattern, avoid updating the DOM manually with jQuery or JS, use observables rather than forcing refreshes manually). 
- Application utilizes the Google Maps API.
- Functionality providing additional data about the locations is provided and sourced from a 3rd party API: Foursquare.
- All data requests are retrieved in an asynchronous manner.
