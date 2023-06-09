'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//workouts parent class
class Workout {
  tag;
  id;

  constructor(coords, type, distance, duration) {
    (this.coords = coords),
      (this.type = type),
      (this.distance = distance),
      (this.duration = duration),
      (this.date = new Date().toDateString().slice(4, 10)), //get month and day
      (this.id = Date.now());
  }
  
  //check if user inputs are valid
  static checkInput(params) {
    return (
      params.every(parameter => parameter > 0) ||
      alert('Inputs have to be positive numbers!')
    );
  }
}
//Cycling class
class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, 'Cycling', distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
  }
  calcSpeed() {
    // in km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//Running class
class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, 'Running', distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    // in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

////////////////////////////////////
//////////APP ARCHITERCURE//////////
////////////////////////////////////

//this class will manage the app
class App {
  #workouts;
  #map;
  #mapEvent;
  #mapZoom;
  constructor() {
    //initiate values
    this.#mapZoom = 13;
    this.#workouts = [];
    //get users location and load map on it
    this._getPosition();

    //attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevetionField);
    containerWorkouts.addEventListener('click', this._moveTo.bind(this));
  }

  _getPosition() {
    //get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        //if successful
        this._loadMap.bind(this),
        //if not
        function () {
          alert('Could not get your position');
        }
      );
    }
  }
  
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoom);
    //map event listener
    this.#map.on('click', this._showForm.bind(this)); //show form on map click

    //set tiles of map to google maps (map UI)
    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    this._loadData();
  }
  
  //load the workouts from local storage
  _loadData() {
    this.#workouts = JSON.parse(localStorage.getItem('workouts'));
    for (const workout of this.#workouts) {
      this._pin(workout);
      this._renderWorkout(workout);
    }
  }
  
  //present the workout form 
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  
  //toggle between the elevation and cadence fields
  _toggleElevetionField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //create a new workout object
  _newWorkout(e) {
    //stop page from reloading on key press
    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    //get inputs from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    const params = [
      distance,
      duration,
      type === 'Running' ? cadence : elevation,
    ];
    //check input
    if (!Workout.checkInput(params)) return;
    //add coords to parameters
    params.unshift(coords);
    //create workout
    const workout =
      type === 'Running' ? new Running(...params) : new Cycling(...params);
    this.#workouts.push(workout);

    this._hideForm();
    this._pin(workout);
    this._renderWorkout(workout);
    //add workout to local storage

    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  
  //reset fields and hide form
  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }
  
  //put a pin popup on the map 
  _pin(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type.toLowerCase()}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'Running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.type} on ${
          workout.date
        }`
      )
      .openPopup();
  }
  
  //create html element for workout and insert it to workout list (siplay on page)
  _renderWorkout(workout) {
    let uniqueData = [];
    if (workout.type === 'Running')
      uniqueData = [
        '🏃‍♂️',
        'km',
        'min',
        workout.pace.toFixed(1),
        'min/km',
        '🦶🏼',
        workout.cadence,
        'spm',
      ];
    else if (workout.type === 'Cycling')
      uniqueData = [
        '🚴‍♀️',
        'km',
        'min',
        workout.speed.toFixed(1),
        'km/h',
        '⛰',
        workout.elevation,
        'm',
      ];
    //create html element
    const html = `<li class="workout workout--${workout.type.toLowerCase()}" data-id=${
      workout.id
    }>
    <h2 class="workout__title">${workout.type} on ${workout.date}</h2>
    <div class="workout__details">
      <span class="workout__icon">${uniqueData[0]}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">${uniqueData[1]}</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">${uniqueData[2]}</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${uniqueData[3]}<</span>
      <span class="workout__unit">${uniqueData[4]}</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${uniqueData[5]}</span>
      <span class="workout__value">${uniqueData[6]}</span>
      <span class="workout__unit">${uniqueData[7]}</span>
    </div>
  </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  //focus screen on the selected pin on click
  _moveTo(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      workout => workout.id === +workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoom);
  }
}

const app = new App();
