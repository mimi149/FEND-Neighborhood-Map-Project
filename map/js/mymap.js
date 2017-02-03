function MyApp() {
	this.map = '';
	this.service = '';
	this.infoWindow = '';
}

myApp = new MyApp();

function ViewModel() {
	var self = this;

	var MARKER_DEFAULT_COLOR = 'F37268';
	var MARKER_ACTIVE_COLOR = 'FFFF24';

	var mapBounds;
	var defaultLocation = "Fountain Valley";

	self.locationMarker;

	self.previousLocation = "";
	self.location = ko.observable(defaultLocation); // user desired location
	self.popularPlaces = ko.observableArray(); // popular places arround the desired location
	self.keyword = ko.observable(''); // searched by user

	self.infoListFlag = ko.observable(true); // boolean flag for info list toggle
	self.notInfoListFlag = ko.observable(false); // boolean flag for up/down arrow for info list
	self.settingFlag = ko.observable(true); // boolean flag for setting toggle
	self.searchFlag = ko.observable(false); // boolean flag for search option toggle
	self.filterFlag = ko.observable(true); // boolean flag for filter option toggle

	// Observable Array for drop down list of categories
	self.categories = ko.observableArray();

	// Hold the selected value from drop down list of categories
	self.selectedCategory = ko.observable('');

	// Set the map height to the window size
	self.mapSize = ko.computed(function () {
		$("#map").height($(window).height());
	});

	// The list of categories will be changed when the places are filtered
	self.filteredCategories = ko.pureComputed(function () {
		var categoryList = [], category;
		if (self.filteredPlaces()) {
			self.filteredPlaces().forEach(function (place) {
				category = place.venue.categories[0].name;
				categoryList.push(category);
			});
			var categorySet = new Set(categoryList);
			return Array.from(categorySet);
		}
	});

	// Update the info list and the markers based on the selected category in the drop down list
	// or the searching keyword
	self.filteredPlaces = ko.computed(function () {
		// close the current infoWindow if opened
		myApp.infoWindow.close();

		var category = self.selectedCategory();
		var keyword = self.keyword().toLowerCase();
		if (self.filterFlag())
			return filter(category);
		else if (self.searchFlag()) {
			return search(keyword);
		}
	});

	function filter(category) {
		var places;
		if (!category) {
			// No input found from the drop down menu, return all places
			places = self.popularPlaces();
			places.forEach(function (place) {
				showMarker(place.marker, true);
			});

		} else { // filter by category
			// Clear the search bar
			self.keyword("");
			places = ko.utils.arrayFilter(self.popularPlaces(), function (place) {
				if (place.venue.categories[0].name === category) {
					showMarker(place.marker, true);
					return true;
				}
				else {
					showMarker(place.marker, false);
					return false;
				}
			});
		}
		return places;
	};

	function search(keyword) {
		var places;
		if (!keyword) {
			// The keyword is empty, return all places
			places = self.popularPlaces();
			places.forEach(function (place) {
				showMarker(place.marker, true);
			});

		} else { // search by name and category, the keyword is not empty
			places = ko.utils.arrayFilter(self.popularPlaces(), function (place) {
				if (place.venue.name.toLowerCase().indexOf(keyword) !== -1 ||
					place.venue.categories[0].name.toLowerCase().indexOf(keyword) !== -1) {
					showMarker(place.marker, true);
					return true;
				}
				else {
					showMarker(place.marker, false);
					return false;
				}
			});
		}
		return places;
	};

	self.placeNumber = ko.pureComputed(function () {
		if (self.filteredPlaces())
			return self.filteredPlaces().length;
	});

	self.categoryNumber = ko.pureComputed(function () {
		if (self.filteredCategories())
			return self.filteredCategories().length;
	});

	function showMarker(marker, show = true) {
		if (marker)
			if (show) {
				marker.setIcon(makeMarkerIcon(MARKER_DEFAULT_COLOR));
				marker.setMap(myApp.map);
			} else {
				marker.setMap(null);
			}
	}

	// Use Google Maps PlacesService to get information for the desired location
	self.neighborUpdate = ko.computed(function () {
		// Only process when google map is loaded successfully
		if (typeof google === 'undefined')
			return;

		if ((self.previousLocation === "") || (self.location() !== self.previousLocation)) {

			// Reset the drop down menu input and search input
			self.selectedCategory("");
			self.keyword("");

			self.previousLocation = self.location();

			// Clear the previous values if exists
			self.popularPlaces().forEach(function (place) {
				if (place.marker) {
					place.marker.setMap(null);
					place.marker = null;
				}
			});
			self.popularPlaces([]);

			// Clear marker for the previous required location if exists
			if (self.locationMarker) {
				self.locationMarker.setMap(null);
				self.locationMarker = null;
			}

			var request = {query: self.location()};
			myApp.service.textSearch(request, function neighborhoodCallback(results, status) {
				if (status == google.maps.places.PlacesServiceStatus.OK) {
					locationProcess(results[0]);
					neighborProcess(results[0]);
				} else {
					alert("Please enter a valid place");
				}
			});
		}
	});

	// Make sure the map bounds get updated on page resize
	window.addEventListener('resize', function (e) {
		myApp.map.fitBounds(mapBounds);
		$("#map").height($(window).height());
	});

	// Toggle the info list
	self.listToggle = function () {
		self.infoListFlag(!self.infoListFlag());
		self.notInfoListFlag(!self.notInfoListFlag());
	};

	// Toggle the setting menu
	self.settingToggle = function () {
		self.settingFlag(!self.settingFlag());
	};

	// Toggle the search/filter option
	self.searchFilterToggle = function () {
		self.searchFlag(!self.searchFlag());
		self.filterFlag(!self.filterFlag());

		// Reset the drop down menu input and search input
		self.selectedCategory("");
		self.keyword("");
	};

	// Trigger click event to the marker when info list item is clicked
	self.markerClick = function (venue) {

		var venueName = venue.venue.name.toLowerCase();
		if (self.filteredPlaces()) {
			self.filteredPlaces().forEach(function (place) {
				var marker = place.marker;
				if (marker.title.toLowerCase() === venueName) {
					google.maps.event.trigger(marker, 'click');
					marker.setIcon(makeMarkerIcon(MARKER_ACTIVE_COLOR));
					myApp.map.panTo(marker.position);
				}
				else // Deactivate all the rest of markers
					marker.setIcon(makeMarkerIcon(MARKER_DEFAULT_COLOR));
			});
		}
	};

	// Get/update the new desired location
	function locationProcess(location) {

		var lat = location.geometry.location.lat();
		var lng = location.geometry.location.lng();
		myApp.map.setCenter(new google.maps.LatLng(lat, lng));

		// Set marker for the desired location
		self.locationMarker = new google.maps.Marker({
			map: myApp.map,
			position: location.geometry.location,
			title: location.name,
			icon: "images/ic_grade_black_18dp.png"
		});

		// Show infoWindow for the desired location
		google.maps.event.addListener(self.locationMarker, 'click', function () {
			myApp.infoWindow.setContent(location.name);
			myApp.infoWindow.open(myApp.map, self.locationMarker);
		});
	}

	// Use Foursquare API to get the popular places around the desired location
	function neighborProcess(location) {
		var lat = location.geometry.location.lat();
		var lng = location.geometry.location.lng();
		baseUri = "https://api.foursquare.com/v2/venues/explore?ll=";
		baseLocation = lat + ", " + lng;
		extraParams = "&limit=50&section=topPicks&day=any&time=any&locale=en&oauth_token=5WJZ5GSQURT4YEG251H42KKKOWUNQXS5EORP2HGGVO4B14AB&v=20141121";
		foursquareQueryUri = baseUri + baseLocation + extraParams;

		$.getJSON(foursquareQueryUri, function (data, status) {
			if (status !== "success") {
				alert("FourSquare services does not work at this time.");
			}
			if (data) {
				self.popularPlaces(data.response.groups[0].items);

				var categoryList = [];
				self.popularPlaces().forEach(function (place) {
					// Add marker to place
					place.marker = markerCreate(place.venue);

					var category = place.venue.categories[0].name;
					// Dynamically retrieve categories to create dropdown list later
					categoryList.push(category);
				});
				var categorySet = new Set(categoryList);
				self.categories(Array.from(categorySet));

				// Change the map zoom level based on suggested bounds
				var bounds = data.response.suggestedBounds;
				if (bounds != undefined) {
					mapBounds = new google.maps.LatLngBounds(
						new google.maps.LatLng(bounds.sw.lat, bounds.sw.lng),
						new google.maps.LatLng(bounds.ne.lat, bounds.ne.lng));
					myApp.map.fitBounds(mapBounds);
				}
			}
		});
	}

	// Create marker for one place
	function markerCreate(venue) {
		// Check if venue is valid
		if (!venue)
			return;

		var lat = venue.location.lat;
		var lng = venue.location.lng;
		var position = new google.maps.LatLng(lat, lng);

		// Use Google Maps Marker API to get marker
		var marker = new google.maps.Marker({
			map: myApp.map,
			position: position,
			animation: google.maps.Animation.DROP,
			title: venue.name
		});

		// Add one more property to marker: infoWindow contains the content to be displayed when this marker is clicked.
		marker.infoWindow = getInfoWindow(venue);

		marker.setIcon(makeMarkerIcon(MARKER_DEFAULT_COLOR));

		marker.addListener('mouseup', function () {
			this.setIcon(makeMarkerIcon(MARKER_ACTIVE_COLOR));
		});

		// Two event listeners - one for mouseover, one for mouseout, to change the colors back and forth.
		marker.addListener('mouseover', function () {
			this.setIcon(makeMarkerIcon(MARKER_ACTIVE_COLOR));
		});
		marker.addListener('mouseout', function () {
			this.setIcon(makeMarkerIcon(MARKER_DEFAULT_COLOR));
		});

		// Create an onclick event to open an infoWindow for each marker.
		marker.addListener('click', function () {
			var markerTitle = this.title;

			// Deactivate other markers
			self.popularPlaces().forEach(function (place) {
				var otherMarker = place.marker;
				if (otherMarker.title !== markerTitle)
					otherMarker.setIcon(makeMarkerIcon(MARKER_DEFAULT_COLOR));
			});

			this.setAnimation(4);

			// Populate InfoWindow for this marker. We'll allow only one infoWindow to be opened when the marker
			// is clicked and it'll appear on that markers position.
			myApp.infoWindow.setContent(this.infoWindow);
			myApp.infoWindow.open(myApp.map, this);

			myApp.map.panTo(this.position);
		});

		return marker;
	}

	// We take some information from the venue to put in the infoWindow
	function getInfoWindow(venue) {
		var name = venue.name;
		var category = venue.categories !== [] ? venue.categories[0].name : '';
		var address = venue.location.formattedAddress;
		var contact = venue.contact.formattedPhone;
		var foursquareUrl = "https://foursquare.com/v/" + venue.id;
		var rating = venue.rating;
		var ratingImg = getRatingImg(rating);

		var content = '<div class="infowindow"><p><span class="v-name">' + name +
			'</span></p><p class="v-category"><span>' + category +
			'</span></p><p class="v-address"><span>' + address + '</span></p>';

		if (contact !== undefined) {
			content += '<p><span class="v-contact">' + contact + '</span></p>';
		}

		if (rating !== undefined) {
			content += '<p><a href="' + foursquareUrl + '" target="_blank"><img class="fs-icon" src="images/Foursquare-icon.png"></a>' +
				'<span class="v-rating">' + (rating / 2).toFixed(1) + '</span><img src="' + ratingImg + '" class="rating-stars"></p></div>';
		} else {
			content += '<p><a href="' + foursquareUrl + '" target="_blank"><img class="fs-icon" src="images/Foursquare-icon.png"></a>' +
				'<span class="v-rating"><em>no rating available</em></span></p></div>';
		}
		return content;
	}

	function getRatingImg(rating) {
		if (rating) {
			var halfRating = rating / 2;
			var img;
			if (halfRating >= 4.9) {
				img = 'images/star-5.0.png';
			} else if (halfRating < 4.9 && halfRating >= 4.25) {
				img = 'images/star-4.5.png';
			} else if (halfRating < 4.25 && halfRating >= 3.75) {
				img = 'images/star-4.0.png';
			} else if (halfRating < 3.75 && halfRating >= 3.25) {
				img = 'images/star-3.5.png';
			} else if (halfRating < 3.25 && halfRating >= 2.75) {
				img = 'images/star-3.0.png';
			} else {
				img = 'images/star-2.5.png';
			}
			return img;
		} else
			return null;
	}

	// This function takes in a color, and then creates a new marker
	// icon of that color. The icon will be 23 px wide by 40 high, have an origin
	// of 0, 0 and be anchored at 10, 40).
	function makeMarkerIcon(markerColor) {
		var markerImage = new google.maps.MarkerImage(
			'https://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
			'|40|_|%E2%80%A2',
			new google.maps.Size(23, 40),
			new google.maps.Point(0, 0),
			new google.maps.Point(10, 40),
			new google.maps.Size(23, 40));
		return markerImage;
	}

}

/**
 * Success callback for Map API request
 */
function initMap() {
	if (typeof google === 'undefined')
		alert("Something is wrong with google API now.");

	else {
		myApp.map = new google.maps.Map(document.getElementById('map'), {
			zoom: 15,
			streetViewControl: false,
			disableDefaultUI: true
		});
		myApp.service = new google.maps.places.PlacesService(myApp.map);
		myApp.infoWindow = new google.maps.InfoWindow();

		// Initialize the view model binding
		myApp.vm = new ViewModel();
		ko.applyBindings(myApp.vm);
	}
}

/**
 * Error callback for GMap API request
 */
function mapError() {
	alert("Something is wrong with google map API now.");
};
