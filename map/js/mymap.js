var NeighborMarker = function (marker, name, category) {
	this.marker = marker,
	this.name = name,
	this.category = category
};

function viewModel() {
	var self = this;
	var map;
	var service;
	var mapBounds;
	var defaultLocation = "Fountain Valley";
	var locationMarker;
	var neighborMarkers = []; // neighborMarkers for neighborhood (popularPlaces or filteredPlaces)
	var infoWindow;

	self.location = ko.observable(defaultLocation);
	self.popularPlaces = ko.observableArray([]);
	self.filteredPlaces = ko.observableArray(self.popularPlaces());
	self.keyword = ko.observable('');
	self.infoListFlag = ko.observable(true); // boolean flag for info list toggle
	self.notInfoListFlag = ko.observable(false); // boolean flag for up/down arrow for info list
	self.settingFlag = ko.observable(true); // boolean flag for setting toggle

	// Set the map height to the window size
	self.mapSize = ko.computed(function () {
		$("#map").height($(window).height());
	});

	// initialize the map
	initMap();

	// Update the info list based on the searching keyword
	self.infoListUpdate = ko.computed(function () {
		var list = [];
		var keyword = self.keyword().toLowerCase();
		self.popularPlaces().forEach(function (item) {
			if (item.venue.name.toLowerCase().indexOf(keyword) !== -1 ||
				item.venue.categories[0].name.toLowerCase().indexOf(keyword) !== -1) {
				list.push(item);
			}
		});
		self.filteredPlaces(list);
	});

	// Update the neighborMarkers based on the searching keyword
	self.markersUpdate = ko.computed(function () {
		var keyword = self.keyword().toLowerCase();
		neighborMarkers.forEach(function (item) {
			if (item.marker.map === null) {
				item.marker.setMap(map);
			}
			if (item.name.toLowerCase().indexOf(keyword) === -1 && item.category.toLowerCase().indexOf(keyword) === -1) {
				item.marker.setMap(null);
			}
		});
	});

	// Use Google Maps PlacesService to get information for the desired location
	self.neighborUpdate = ko.computed(function () {
		if (self.location()) {
			if (locationMarker) {
				locationMarker.setMap(null);
				locationMarker = null;
			}
			markersRemove();
			var request = {query: self.location()};
			service = new google.maps.places.PlacesService(map);
			service.textSearch(request, function neighborhoodCallback(results, status) {
				if (status == google.maps.places.PlacesServiceStatus.OK) {
					locationProcess(results[0]);
					neighborProcess(results[0]);
				}
			});
			self.keyword('');
		}
	});

	// Make sure the map bounds get updated on page resize
	window.addEventListener('resize', function (e) {
		map.fitBounds(mapBounds);
		$("#map").height($(window).height());
	});

	function initMap() {
		var mapOptions = {
			zoom: 14,
			disableDefaultUI: true
		};
		map = new google.maps.Map(document.querySelector('#map'), mapOptions);
		infoWindow = new google.maps.InfoWindow();
	}

	// Toggle the info list
	self.listToggle = function () {
		self.infoListFlag(!self.infoListFlag());
		self.notInfoListFlag(!self.notInfoListFlag());
	};

	// Toggle the setting menu
	self.settingToggle = function () {
		self.settingFlag(!self.settingFlag());
	};

	// Trigger click event to neighborMarkers when info list item is clicked
	self.markerClick = function (venue) {
		var venueName = venue.venue.name.toLowerCase();
		neighborMarkers.forEach(function (item) {
			if (item.name.toLowerCase() === venueName) {
				google.maps.event.trigger(item.marker, 'click');
				map.panTo(item.marker.position);
			}
		});
	};

	// Get popular places around the desired location and set the neighborMarkers
	function locationProcess(location) {
		var lat = location.geometry.location.lat();
		var lng = location.geometry.location.lng();
		map.setCenter(new google.maps.LatLng(lat, lng));

		locationMarker = new google.maps.Marker({
			map: map,
			position: location.geometry.location,
			title: location.name,
			icon: "images/ic_grade_black_18dp.png"
		});
		// Show infoWindow to the desired location
		google.maps.event.addListener(locationMarker, 'click', function () {
			infoWindow.setContent(location.name);
			infoWindow.open(map, locationMarker);
		});
	}

	function neighborProcess(location) {
		// Use Foursquare API to get the popular places around the desired location
		// Set the neighborMarkers and zoom the map to show all the neighborMarkers
		var lat = location.geometry.location.lat();
		var lng = location.geometry.location.lng();
		baseUri = "https://api.foursquare.com/v2/venues/explore?ll=";
		baseLocation = lat + ", " + lng;
		extraParams = "&limit=30&section=topPicks&day=any&time=any&locale=en&oauth_token=5WJZ5GSQURT4YEG251H42KKKOWUNQXS5EORP2HGGVO4B14AB&v=20141121";
		foursquareQueryUri = baseUri + baseLocation + extraParams;
		$.getJSON(foursquareQueryUri, function (data) {
			if (data) {
				self.popularPlaces(data.response.groups[0].items);
				self.popularPlaces().forEach(function (item) {
					item.activeFlag = false;
					markerCreate(item.venue);
				});

				// Change the map zoom level based on suggested bounds
				var bounds = data.response.suggestedBounds;
				if (bounds != undefined) {
					mapBounds = new google.maps.LatLngBounds(
						new google.maps.LatLng(bounds.sw.lat, bounds.sw.lng),
						new google.maps.LatLng(bounds.ne.lat, bounds.ne.lng));
					map.fitBounds(mapBounds);
				}
			}
		});
	}

	// Create marker for one place
	function markerCreate(venue) {
		if (!venue)
			return;

		var lat = venue.location.lat;
		var lng = venue.location.lng;
		var position = new google.maps.LatLng(lat, lng);
		var name = venue.name;
		var category = venue.categories !== [] ? venue.categories[0].name : '';

		// Use Google Maps Marker API to get marker
		var marker = new google.maps.Marker({
			map: map,
			position: position,
			title: name
		});

		neighborMarkers.push(new NeighborMarker(marker, name.toLowerCase(), category.toLowerCase()));
		map.panTo(position);

		// Create an onclick event to open an infoWindow for each marker.
		marker.addListener('click', function () {
			populateInfoWindow(this, venue);
			map.panTo(this.position);

		});

		// Two event listeners - one for mouseover, one for mouseout, to change the colors back and forth.
		marker.addListener('mouseover', function () {
			this.setIcon(makeMarkerIcon('FFFF24'));
		});
		marker.addListener('mouseout', function () {
			this.setIcon(makeMarkerIcon('F37268'));
		});
	}

	// Remove neighborhood neighborMarkers from the map
	// This method is called when neighborhood is newly defined
	function markersRemove() {
		neighborMarkers.forEach(function (item) {
			item.marker.setMap(null);
			item.marker = null;
		});
		neighborMarkers = [];
	}

	// This function populates the infoWindow when the marker is clicked. We'll only allow
	// one infoWindow which will open at the marker that is clicked, and populate based
	// on that markers position.
	function populateInfoWindow(marker, venue) {
		var name = venue.name;
		var category = venue.categories !== [] ? venue.categories[0].name : '';
		var address = venue.location.formattedAddress;
		var contact = venue.contact.formattedPhone;
		var foursquareUrl = "https://foursquare.com/v/" + venue.id;
		var rating = venue.rating;
		var ratingImg = getRatingImg(rating);
		// Check to make sure the infoWindow is not already opened on this marker.
		if (infoWindow.marker !== marker) {
			infoWindow.marker = marker;
			var content = '<div class="infowindow"><p><span class="v-name">' + name +
				'</span></p><p class="v-category"><span>' + category +
				'</span></p><p class="v-address"><span>' + address + '</span></p>';

			if (contact !== undefined) {
				content += '<p><span class="v-contact">' + contact + '</span></p>';
			}

			if (rating !== undefined) {
				content += '<p><a href="' + foursquareUrl + '" target="_blank"><img class="fs-icon" src="images/Foursquare-icon.png"></a>' +
					'<span class="v-rating">' + (rating/2).toFixed(1) + '</span><img src="' + ratingImg + '" class="rating-stars"></p></div>';
			} else {
				content += '<p><a href="' + foursquareUrl + '" target="_blank"><img class="fs-icon" src="images/Foursquare-icon.png"></a>' +
					'<span class="v-rating"><em>no rating available</em></span></p></div>';
			}

			infoWindow.setContent(content);
			infoWindow.open(map, marker);
		}
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

	// This function takes in a COLOR, and then creates a new marker
	// icon of that color. The icon will be 21 px wide by 34 high, have an origin
	// of 0, 0 and be anchored at 10, 34).
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

// Initialize the view model binding
$(function () {
	var vm = new viewModel();
	ko.applyBindings(vm);
});
