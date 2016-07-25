document.addEventListener("DOMContentLoaded", function () {

    if (!Notification) {
        console.log('could not load notifications');
        return;
    }

    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

var $selectExclude = $("#exclude-pokemon");
var $selectNotify = $("#notify-pokemon");
var currentMarker;
var locationMarker;
var lastStamp = 0;
var requestInterval = 10000;
var is_gsearchDisplay = true;
var isSearching = false;
var searchStatusInterval;
var currentLat = center_lat;
var currentLng = center_lng;
var locChanged = false;
var newLocation = {};
var mapUpdateTimer;

$.getJSON("static/locales/pokemon." + document.documentElement.lang + ".json").done(function(data) {
    var pokeList = []

    $.each(data, function(key, value) {
        pokeList.push( { id: key, text: value } );
    });

    JSON.parse(readCookie("remember_select_exclude"));
    $selectExclude.select2({
        placeholder: "Select Pokémon",
        data: pokeList
    });
    $selectExclude.val(JSON.parse(readCookie("remember_select_exclude"))).trigger("change");
    
    JSON.parse(readCookie("remember_select_notify"));
    $selectNotify.select2({
        placeholder: "Select Pokémon",
        data: pokeList
    });
    $selectNotify.val(JSON.parse(readCookie("remember_select_notify"))).trigger("change");
});

var excludedPokemon = [];
var notifiedPokemon = [];

$selectExclude.on("change", function (e) {
    excludedPokemon = $selectExclude.val().map(Number);
    clearStaleMarkers();
    document.cookie = 'remember_select_exclude='+JSON.stringify(excludedPokemon)+
            '; max-age=31536000; path=/';
});

$selectNotify.on("change", function (e) {
    notifiedPokemon = $selectNotify.val().map(Number);
    document.cookie = 'remember_select_notify='+JSON.stringify(notifiedPokemon)+
            '; max-age=31536000; path=/';
});

var map;

var light2Style=[{"elementType":"geometry","stylers":[{"hue":"#ff4400"},{"saturation":-68},{"lightness":-4},{"gamma":0.72}]},{"featureType":"road","elementType":"labels.icon"},{"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"hue":"#0077ff"},{"gamma":3.1}]},{"featureType":"water","stylers":[{"hue":"#00ccff"},{"gamma":0.44},{"saturation":-33}]},{"featureType":"poi.park","stylers":[{"hue":"#44ff00"},{"saturation":-23}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"hue":"#007fff"},{"gamma":0.77},{"saturation":65},{"lightness":99}]},{"featureType":"water","elementType":"labels.text.stroke","stylers":[{"gamma":0.11},{"weight":5.6},{"saturation":99},{"hue":"#0091ff"},{"lightness":-86}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"lightness":-48},{"hue":"#ff5e00"},{"gamma":1.2},{"saturation":-23}]},{"featureType":"transit","elementType":"labels.text.stroke","stylers":[{"saturation":-64},{"hue":"#ff9100"},{"lightness":16},{"gamma":0.47},{"weight":2.7}]}];
var darkStyle=[{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#b39964"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#181818"},{"lightness":16}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"lightness":17},{"color":"#525252"}]}];
var pGoStyle=[{"featureType":"landscape.man_made","elementType":"geometry.fill","stylers":[{"color":"#a1f199"}]},{"featureType":"landscape.natural.landcover","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"landscape.natural.terrain","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"poi.attraction","elementType":"geometry.fill","stylers":[{"visibility":"on"}]},{"featureType":"poi.business","elementType":"geometry.fill","stylers":[{"color":"#e4dfd9"}]},{"featureType":"poi.business","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#84b09e"}]},{"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#fafeb8"},{"weight":"1.25"}]},{"featureType":"road.highway","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#5ddad6"}]}];

var selectedStyle = 'light';

function initMap() {


    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: center_lat,
            lng: center_lng
        },
        zoom: 16,
        streetViewControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.RIGHT_TOP,
          mapTypeIds: [
              google.maps.MapTypeId.ROADMAP,
              google.maps.MapTypeId.SATELLITE,
              'dark_style',
              'style_light2',
              'style_pgo']
        },
    });

     var style_dark = new google.maps.StyledMapType(darkStyle, {name: "Dark"});
    map.mapTypes.set('dark_style', style_dark);

    var style_light2 = new google.maps.StyledMapType(light2Style, {name: "Light2"});
    map.mapTypes.set('style_light2', style_light2);

    var style_pgo = new google.maps.StyledMapType(pGoStyle, {name: "PokemonGo"});
    map.mapTypes.set('style_pgo', style_pgo);

    map.addListener('maptypeid_changed', function(s) {
        localStorage['map_style'] = this.mapTypeId;
    });

    if (!localStorage['map_style'] || localStorage['map_style'] === 'undefined') {
        localStorage['map_style'] = 'roadmap';
    }

    map.setMapTypeId(localStorage['map_style']);

    if(is_gsearchDisplay){
        InitPlaces();
    }
    
    setCurrentMarker(center_lat, center_lng);
    updateMapTimer();
    initMapClick(map);
    setUpGeoLocation();
    initSidebar();

   
};

function initMapClick(map) {

    google.maps.event.addListener(map, 'click', function(event) {
        var lat = event.latLng.lat();
        var lng = event.latLng.lng();
        localStorage["geoLocate"] = false;
        $('#geoloc-switch').checked = false;
        setCurrentMarker(lat,lng);
         setNewLocation(lat, lng);
    });

};


/**
 * set the current marker location
 * lat = latitude, lng = longitude, title = name of the marker
 */
var setCurrentMarker = function(lat, lng, title){

    clearCurrentMarker();

    var newLocation={};
    newLocation.lat=lat;
    newLocation.lng=lng;

    currentMarker = new google.maps.Marker({
        position: newLocation,
        map: map,
        title: title,
        animation: google.maps.Animation.DROP
    });
};

/**
 * calls the server api to change the location
 */
var setNewLocation = function(lat, lng){
    newLocation={};
    newLocation.lat = Number(lat);
    newLocation.lon = Number(lng);

    currentLat = lat;
    currentLng = lng;

    locChanged = true;

    updateMap();
    
}

//PLACES ADDITION

InitPlaces = function(){
    var sInput = document.getElementById('pac-input');
    sInput.style.display="inherit";

    var searchBox = new google.maps.places.SearchBox(sInput);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(sInput);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {

            $('#geoloc-switch').checked = false;
            localStorage["geoLocate"] = false;

            //for now we assume one place, technically this is a for loop
            //so its possible to set current marker multiple times
            setCurrentMarker(place.geometry.location.lat(), place.geometry.location.lng(), place.name);
            
            //lets make a call to the api to change the lat lon, reset the search
            setNewLocation(place.geometry.location.lat(), place.geometry.location.lng());
           
            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });

        //reset the map focus
        map.fitBounds(bounds);
        map.setZoom(15);
    });
};

/**
 * clears the current marker
 */
var clearCurrentMarker=function(){
    if(currentMarker!=null){
        //clear the marker
        currentMarker.setMap(null);
        currentMarker = null;
    }
}

/**
 * set the current marker location
 * lat = latitude, lng = longitude, title = name of the marker
 */
var setCurrentMarker = function(lat, lng, title){

    clearCurrentMarker();

    var newLocation={};
    newLocation.lat=lat;
    newLocation.lng=lng;

    currentMarker = new google.maps.Marker({
        position: newLocation,
        map: map,
        title: title,
        animation: google.maps.Animation.DROP
    });
};

searchControlURI = 'search_control'
function searchControl(action){
  return $.post(searchControlURI + '?action='+encodeURIComponent(action));
}
function searchControlStatus(callback){
  $.getJSON(searchControlURI).then(function(data){
    if (data.status === 'idle') {
        isSearching = false;
        $('body').removeClass('searching');

        if (mapUpdateTimer) {
            setTimeout(function(){
                if (!isSearching && mapUpdateTimer) {
                    clearInterval(mapUpdateTimer);
                    mapUpdateTimer = false;
                    updateMap();
                }
            }, 5000);
        }
        
    } else {
        $('body').addClass('searching');
        isSearching = true;
    }

    if (callback) {
        callback(data.status);
    }
  })
}
function updateSearchStatus(){
  searchControlStatus(function(){

    

  });
}

function initSidebar() {
    $('#pokemon-switch').prop('checked', localStorage.showPokemon === 'true');
    $('#geoloc-switch').prop('checked', localStorage.geoLocate === 'true');

    searchControlStatus();

    searchStatusInterval = setInterval(searchControlStatus, 1000);
    
    $('button#stop-search').click(function(){
       searchControl('stop');
     });
 
    $('button#start-search').click(function(){

        searchControlStatus(function(){
            if(!isSearching) {
                clearInterval(searchStatusInterval);
                isSearching = true;
                $('body').addClass('searching');

                if (locChanged) {
                    $.post("next_loc", newLocation).done(function(){
                            searchControl('start').done(function(){
                            mapUpdateTimer = setInterval(updateMap, 5000);

                            setTimeout(function(){
                                searchControlStatus();
                                searchStatusInterval = setInterval(searchControlStatus, 1000);
                            }, 5000);
                        });  
                    })
                    .fail(function(data){
                        alert('next_loc failed for: ' + newLocation);
                    });
                } else {
                    searchControl('start').done(function(){
                        mapUpdateTimer = setInterval(updateMap, 5000);

                        setTimeout(function(){
                            searchControlStatus();
                            searchStatusInterval = setInterval(searchControlStatus, 1000);
                        }, 5000);
                    });

                }
                
            } else {
                return;
            }
        });
      
    });
}


function pokemonLabel(name, disappear_time, id, latitude, longitude) {
    disappear_date = new Date(disappear_time)
    var pad = function (number) { return number <= 99 ? ("0" + number).slice(-2) : number; }

    var contentstring = `
        <div>
            <b>${name}</b>
            <span> - </span>
            <small>
                <a href='http://www.pokemon.com/us/pokedex/${id}' target='_blank' title='View in Pokedex'>#${id}</a>
            </small>
        </div>
        <div>
            Disappears at ${pad(disappear_date.getHours())}:${pad(disappear_date.getMinutes())}:${pad(disappear_date.getSeconds())}
            <span class='label-countdown' disappears-at='${disappear_time}'>(00m00s)</span></div>
        <div>
            <a href='https://www.google.com/maps/dir/Current+Location/${latitude},${longitude}'
                    target='_blank' title='View in Maps'>Get directions</a>
        </div>`;
    return contentstring;
};

function gymLabel(team_name, team_id, gym_points) {
    var gym_color = ["0, 0, 0, .4", "74, 138, 202, .6", "240, 68, 58, .6", "254, 217, 40, .6"];
    var str;
    if (team_name == 0) {
        str = `<div><center>
            <div>
                <b style='color:rgba(${gym_color[team_id]})'>${team_name}</b><br>
            </div>
            </center></div>`;
    } else {
        str = `
            <div><center>
            <div style='padding-bottom: 2px'>Gym owned by:</div>
            <div>
                <b style='color:rgba(${gym_color[team_id]})'>Team ${team_name}</b><br>
                <img height='70px' style='padding: 5px;' src='static/forts/${team_name}_large.png'>
            </div>
            <div>Prestige: ${gym_points}</div>
            </center></div>`;
    }

    return str;
}

// Dicts
map_pokemons = {} // Pokemon
map_gyms = {} // Gyms
map_pokestops = {} // Pokestops
var gym_types = ["Uncontested", "Mystic", "Valor", "Instinct"];

function setupPokemonMarker(item) {
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/icons/' + item.pokemon_id + '.png'
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: pokemonLabel(item.pokemon_name, item.disappear_time, item.pokemon_id, item.latitude, item.longitude)
    });
    
    if (notifiedPokemon.indexOf(item.pokemon_id) > -1) {
        sendNotification('A ' + item.pokemon_name + ' Appeared', 'Click to load map', 'static/icons/' + item.pokemon_id + '.png')
    }

    addListeners(marker);
    return marker;
};

function setupGymMarker(item) {
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/forts/' + gym_types[item.team_id] + '.png'
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
    });

    addListeners(marker);
    return marker;
};

function setupPokestopMarker(item) {
    var imagename = item.lure_expiration ? "PstopLured" : "Pstop";
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/forts/' + imagename + '.png',
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: "I'm a Pokéstop, and soon enough I'll tell you more things about me."
    });

    addListeners(marker);
    return marker;
};

function addListeners(marker) {
    marker.addListener('click', function() {
        marker.infoWindow.open(map, marker);
        updateLabelDiffTime();
        marker.persist = true;
    });

    google.maps.event.addListener(marker.infoWindow, 'closeclick', function() {
        marker.persist = null;
    });

    marker.addListener('mouseover', function() {
        marker.infoWindow.open(map, marker);
        updateLabelDiffTime();
    });

    marker.addListener('mouseout', function() {
        if (!marker.persist) {
            marker.infoWindow.close();
        }
    });
    return marker
};

function clearStaleMarkers() {
    $.each(map_pokemons, function(key, value) {

        if (map_pokemons[key]['disappear_time'] < new Date().getTime() ||
                excludedPokemon.indexOf(map_pokemons[key]['pokemon_id']) >= 0) {
            map_pokemons[key].marker.setMap(null);
            delete map_pokemons[key];
        }
    });
};

function updateMap() {
    
    localStorage.showPokemon = localStorage.showPokemon || true;
    localStorage.showGyms = localStorage.showGyms || true;
    localStorage.showPokestops = localStorage.showPokestops || true;

    var boundingBox = getBoundingBox([currentLat, currentLng], 1);

    $.ajax({
        url: "raw_data",
        type: 'GET',
        data: {
            'pokemon': localStorage.showPokemon,
            'pokestops': false,
            'gyms': false,
            'swLat': boundingBox[1],
            'swLng': boundingBox[0],
            'neLat': boundingBox[3],
            'neLng': boundingBox[2]
        },
        dataType: "json"
    }).done(function(result) {
      $.each(result.pokemons, function(i, item){
          if (!localStorage.showPokemon) {
              return false; // in case the checkbox was unchecked in the meantime.
          }
          if (!(item.encounter_id in map_pokemons) &&
                    excludedPokemon.indexOf(item.pokemon_id) < 0) {
              // add marker to map and item to dict
              if (item.marker) item.marker.setMap(null);
              item.marker = setupPokemonMarker(item);
              map_pokemons[item.encounter_id] = item;
          }
        });

    });
};

$('#geoloc-switch').change(function() {
     if(!navigator.geolocation){
        this.checked = false;
     } else {
         localStorage["geoLocate"] = this.checked;
     }
 });

function setUpGeoLocation() {
    window.setInterval(function() {
       if(navigator.geolocation && localStorage.geoLocate === 'true') {
         navigator.geolocation.getCurrentPosition(function (position){
           var baseURL = location.protocol + "//" + location.hostname + (location.port ? ":"+location.port: "");
           lat = position.coords.latitude;
           lon = position.coords.longitude;
           $.post(baseURL + "/next_loc?lat=" + lat + "&lon=" + lon).done(function(){
             var center = new google.maps.LatLng(lat, lon);
             //only move the map and marker if you've moved 10 meters (30 ft)... hopefully that's a good balance.
               //and base it on the marker, not the center of the map! duh.
             if(google.maps.geometry.spherical.computeDistanceBetween(center, currentMarker.getPosition()) > 10)
               map.panTo(center);
             currentMarker.setPosition(center);
           });
         });
      }
     }, 1000);
}

function updateMapTimer() {
    window.setInterval(clearStaleMarkers, 5000);
    updateMap();
}


// document.getElementById('gyms-switch').onclick = function() {
//     localStorage["showGyms"] = this.checked;
//     if (this.checked) {
//         updateMap();
//     } else {
//         $.each(map_gyms, function(key, value) {
//             map_gyms[key].marker.setMap(null);
//         });
//         map_gyms = {}
//     }
// };

// $('#pokemon-switch').change(function() {
//     localStorage["showPokemon"] = this.checked;
//     if (this.checked) {
//         updateMap();
//     } else {
//         $.each(map_pokemons, function(key, value) {
//             map_pokemons[key].marker.setMap(null);
//         });
//         map_pokemons = {}
//     }
// });

// $('#pokestops-switch').change(function() {
//     localStorage["showPokestops"] = this.checked;
//     if (this.checked) {
//         updateMap();
//     } else {
//         $.each(map_pokestops, function(key, value) {
//             map_pokestops[key].marker.setMap(null);
//         });
//         map_pokestops = {}
//     }
// });

var updateLabelDiffTime = function() {
    $('.label-countdown').each(function(index, element) {
        var disappearsAt = new Date(parseInt(element.getAttribute("disappears-at")));
        var now = new Date();

        var difference = Math.abs(disappearsAt - now);
        var hours = Math.floor(difference / 36e5);
        var minutes = Math.floor((difference - (hours * 36e5)) / 6e4);
        var seconds = Math.floor((difference - (hours * 36e5) - (minutes * 6e4)) / 1e3);

        if (disappearsAt < now) {
            timestring = "(expired)";
        } else {
            timestring = "(";
            if (hours > 0)
                timestring = hours + "h";

            timestring += ("0" + minutes).slice(-2) + "m";
            timestring += ("0" + seconds).slice(-2) + "s";
            timestring += ")";
        }

        $(element).text(timestring)
    });
};

window.setInterval(updateLabelDiffTime, 1000);

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

'use strict';

/**
 * @param {number} distance - distance (km) from the point represented by centerPoint
 * @param {array} centerPoint - two-dimensional array containing center coords [latitude, longitude]
 * @description
 *   Computes the bounding coordinates of all points on the surface of a sphere
 *   that has a great circle distance to the point represented by the centerPoint
 *   argument that is less or equal to the distance argument.
 *   Technique from: Jan Matuschek <http://JanMatuschek.de/LatitudeLongitudeBoundingCoordinates>
 * @author Alex Salisbury
*/

getBoundingBox = function (centerPoint, distance) {
  var MIN_LAT, MAX_LAT, MIN_LON, MAX_LON, R, radDist, degLat, degLon, radLat, radLon, minLat, maxLat, minLon, maxLon, deltaLon;
  if (distance < 0) {
    return 'Illegal arguments';
  }
  // helper functions (degrees<–>radians)
  Number.prototype.degToRad = function () {
    return this * (Math.PI / 180);
  };
  Number.prototype.radToDeg = function () {
    return (180 * this) / Math.PI;
  };
  // coordinate limits
  MIN_LAT = (-90).degToRad();
  MAX_LAT = (90).degToRad();
  MIN_LON = (-180).degToRad();
  MAX_LON = (180).degToRad();
  // Earth's radius (km)
  R = 6378.1;
  // angular distance in radians on a great circle
  radDist = distance / R;
  // center point coordinates (deg)
  degLat = centerPoint[0];
  degLon = centerPoint[1];
  // center point coordinates (rad)
  radLat = degLat.degToRad();
  radLon = degLon.degToRad();
  // minimum and maximum latitudes for given distance
  minLat = radLat - radDist;
  maxLat = radLat + radDist;
  // minimum and maximum longitudes for given distance
  minLon = void 0;
  maxLon = void 0;
  // define deltaLon to help determine min and max longitudes
  deltaLon = Math.asin(Math.sin(radDist) / Math.cos(radLat));
  if (minLat > MIN_LAT && maxLat < MAX_LAT) {
    minLon = radLon - deltaLon;
    maxLon = radLon + deltaLon;
    if (minLon < MIN_LON) {
      minLon = minLon + 2 * Math.PI;
    }
    if (maxLon > MAX_LON) {
      maxLon = maxLon - 2 * Math.PI;
    }
  }
  // a pole is within the given distance
  else {
    minLat = Math.max(minLat, MIN_LAT);
    maxLat = Math.min(maxLat, MAX_LAT);
    minLon = MIN_LON;
    maxLon = MAX_LON;
  }
  return [
    minLon.radToDeg(),
    minLat.radToDeg(),
    maxLon.radToDeg(),
    maxLat.radToDeg()
  ];
};

function sendNotification(title, text, icon) {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    } else {
        var notification = new Notification(title, {
            icon: icon,
            body: text,
            sound: 'sounds/ding.mp3'
        });

        notification.onclick = function () {
            window.open(window.location.href);
        };
    }
}