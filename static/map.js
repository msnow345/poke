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
    var newLocation={};
    newLocation.lat = Number(lat);
    newLocation.lon = Number(lng);

    $.post("next_loc", newLocation).done(function(){
        searchControl('stop').done(function(){
            // searchControl('start');
        });
    })
    .fail(function(data){
        alert('next_loc failed for: ' + newLocation);
    });
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
    } else {
        $('body').addClass('searching');
        isSearching = true;
        setTimeout(function(){
            searchControlStatus();
        },1000);
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

    $('button#stop-search').click(function(){
       searchControl('stop');
     });
 
    $('button#start-search').click(function(){

        searchControlStatus(function(){
            if(!isSearching) {
                isSearching = true;
                $('body').addClass('searching');
                searchControl('start').done(function(){
                    searchControlStatus();
                });
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

    $.ajax({
        url: "raw_data",
        type: 'GET',
        data: {
            'pokemon': localStorage.showPokemon,
            'pokestops': false,
            'gyms': false
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

        // $.each(result.pokestops, function(i, item) {
        //     if (!localStorage.showPokestops) {
        //         return false;
        //     } else if (!(item.pokestop_id in map_pokestops)) { // add marker to map and item to dict
        //         // add marker to map and item to dict
        //         if (item.marker) item.marker.setMap(null);
        //         item.marker = setupPokestopMarker(item);
        //         map_pokestops[item.pokestop_id] = item;
        //     }

        // });

        // $.each(result.gyms, function(i, item){
        //     if (!localStorage.showGyms) {
        //         return false; // in case the checkbox was unchecked in the meantime.
        //     }

        //     if (item.gym_id in map_gyms) {
        //         // if team has changed, create new marker (new icon)
        //         if (map_gyms[item.gym_id].team_id != item.team_id) {
        //             map_gyms[item.gym_id].marker.setMap(null);
        //             map_gyms[item.gym_id].marker = setupGymMarker(item);
        //         } else { // if it hasn't changed generate new label only (in case prestige has changed)
        //             map_gyms[item.gym_id].marker.infoWindow = new google.maps.InfoWindow({
        //                 content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
        //             });
        //         }
        //     }
        //     else { // add marker to map and item to dict
        //         if (item.marker) item.marker.setMap(null);
        //         item.marker = setupGymMarker(item);
        //         map_gyms[item.gym_id] = item;
        //     }

        // });

        clearStaleMarkers();
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
    window.setInterval(updateMap, 5000);
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