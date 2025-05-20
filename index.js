function setup() {
  let firstCard, secondCard, lock = false;
  let matchedPairs = 0;
  let clicks = 0;
  let totalPairs = 0;
  let totalTime = 0;
  let timePassed = 0;
  let timerId = null;
  let difficulty = "easy";
  let pokemonList = [];
  let powerUpTimeoutId;
  let gameActive = false;

  const backImageUrl = "back.webp";

  // Hide stuff at first
  $("#game_stats").hide();
  $("#game_grid").hide();
  $("#theme_buttons").hide();
  $("#reset_button").show();
  $("#start_button").show();

  // Set the default difficulty button
  $(".difficulty").removeClass("selected");
  $("#easy").addClass("selected");
  difficulty = "easy";
  setDifficultyTime(difficulty);

  // Theme switchers
  $(document).on("click", "#light_theme", function () {
    $("#game_grid").removeClass("dark").addClass("light");
  });

  $(document).on("click", "#dark_theme", function () {
    $("#game_grid").removeClass("light").addClass("dark");
  });

  // Grab the Pokemon list once at the start
  loadPokemonList();

  // Inside triggerPowerUp(), check gameActive
  function triggerPowerUp() {
    if (!gameActive || !$("#game_grid").is(":visible") || $(".card").length === 0) {
      return; 
    }

    alert("Power Up!");
    lock = true; 

    $(".card").not(".matched").addClass("flip");

    setTimeout(() => {
      $(".card").not(".matched").removeClass("flip");
      lock = false;
    }, 1000);
  }

  function scheduleRandomPowerUp() {
    if (!gameActive) return; 

    // Random time between 15-40 seconds
    const randomDelay = Math.floor(Math.random() * 25000) + 15000; 

    powerUpTimeoutId = setTimeout(() => {
      triggerPowerUp();
      scheduleRandomPowerUp();
    }, randomDelay);
  }

  function setDifficultyTime(level) {
    switch (level) {
      case "easy":
        totalTime = 100;
        break;
      case "medium":
        totalTime = 200;
        break;
      case "hard":
        totalTime = 300;
        break;
    }
    $("#total_time").text(totalTime);
  }

  // Get the full Pokemon list from the API
  async function loadPokemonList() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1500");
      const data = await response.json();
      pokemonList = data.results; 
      console.log(`Loaded ${pokemonList.length} Pokémon`);
    } catch (e) {
      alert("Failed to load Pokémon list from API.");
      console.error(e);
    }
  }

  // Grab the image for a single Pokemon
  async function fetchPokemonImage(pokemon) {
    try {
      const res = await fetch(pokemon.url);
      const data = await res.json();
      let img = data.sprites?.other?.["official-artwork"]?.front_default;

      if (!img) img = data.sprites?.front_default;

      if (!img) {
        img = data.sprites?.versions?.["generation-i"]?.["red-blue"]?.front_default;
      }

      return img;
    } catch (e) {
      console.warn(`Failed to fetch image for ${pokemon.name}`);
      return null;
    }
  }

  // Shuffle array in place
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Create cards based on difficulty and images
  async function generatePokemonCards(level) {
    if (!pokemonList.length) {
      alert("Pokémon list not loaded yet, please wait.");
      return;
    }

    // Clear previous cards
    $("#game_grid").empty();

    // Decide pairs and grid size
    let pairsCount, columns, rows;
    switch (level) {
      case "easy":
        pairsCount = 3;
        columns = 3;
        rows = 2;
        break;
      case "medium":
        pairsCount = 6;
        columns = 4;
        rows = 3;
        break;
      case "hard":
        pairsCount = 12;
        columns = 6;
        rows = 4;
        break;
      default:
        pairsCount = 3;
        columns = 3;
        rows = 2;
    }
    totalPairs = pairsCount;

    // Update the grid style
    $("#game_grid").css({
      "grid-template-columns": `repeat(${columns}, 1fr)`,
      "grid-template-rows": `repeat(${rows}, 1fr)`,
    });

    setDifficultyTime(level);

    // Pick some Pokemon at random
    shuffleArray(pokemonList);
    let selectedPokemons = pokemonList.slice(0, pairsCount);

    // Get images for all chosen Pokemon
    const images = await Promise.all(selectedPokemons.map(fetchPokemonImage));

    // Prepare pairs of cards
    let cardsData = [];
    for (let i = 0; i < pairsCount; i++) {
      if (!images[i]) continue; 
      cardsData.push({ name: selectedPokemons[i].name, img: images[i] });
      cardsData.push({ name: selectedPokemons[i].name, img: images[i] });
    }

    // Shuffle pairs so they're mixed up
    shuffleArray(cardsData);

    // Add the cards to the grid
    cardsData.forEach((card, index) => {
      const cardHTML = `
        <div class="card" data-name="${card.name}">
          <div class="front_face">
            <img src="${card.img}" alt="${card.name}" />
          </div>
          <div class="back_face">
            <img src="${backImageUrl}" alt="back" />
          </div>
        </div>
      `;
      $("#game_grid").append(cardHTML);
    });
  }

  // Show current stats
  function updateStats() {
    $("#clicks").text(clicks);
    $("#matched").text(matchedPairs);
    $("#left").text(totalPairs - matchedPairs);
    $("#total").text(totalPairs);
  }

  // Show elapsed time
  function updateTimePassedDisplay(passed) {
    $("#time_passed").text(passed);
    $("#second_label").text(passed === 1 ? "second" : "seconds");
  }

  function resetSelection() {
    firstCard = undefined;
    secondCard = undefined;
    lock = false;
  }

  function startTimer() {
    timerId = setInterval(() => {
      timePassed++;
      updateTimePassedDisplay(timePassed);
      if (timePassed >= totalTime) {
        clearInterval(timerId);
        clearTimeout(powerUpTimeoutId);
        alert("Time's up. You lost!");
        resetGameUI();
      }
    }, 1000);
  }

  function bindCardClick() {
    $(".card").off("click").on("click", function () {
      if (lock || $(this).hasClass("flip")) return;

      clicks++;
      updateStats();
      $(this).addClass("flip");

      if (!firstCard) {
        firstCard = $(this).find(".front_face img")[0];
      } else {
        secondCard = $(this).find(".front_face img")[0];
        lock = true;

        if (firstCard.src === secondCard.src) {
          const firstCardDiv = $(firstCard).closest(".card");
          const secondCardDiv = $(secondCard).closest(".card");

          firstCardDiv.addClass("matched").off("click");
          secondCardDiv.addClass("matched").off("click");

          matchedPairs++;
          updateStats();
          resetSelection();

          if (matchedPairs === totalPairs) {
            clearInterval(timerId);
            clearTimeout(powerUpTimeoutId);
            gameActive = false;
            setTimeout(() => alert("Congratulations! You win!"), 500);
          }
        } else {
          setTimeout(() => {
            $(firstCard).closest(".card").removeClass("flip");
            $(secondCard).closest(".card").removeClass("flip");
            resetSelection();
          }, 1000);
        }
      }
    });
  }

  function resetGameUI() {
    clearInterval(timerId);
    clearTimeout(powerUpTimeoutId);
    gameActive = false; 

    firstCard = secondCard = undefined;
    matchedPairs = clicks = timePassed = 0;
    lock = false;

    $(".card").removeClass("flip");
    updateStats();
    updateTimePassedDisplay(0);

    $("#game_stats").hide();
    $("#game_grid").hide();
    $("#theme_buttons").hide();

    $("#start_button").show();
  }

  $(".difficulty").on("click", async function () {
    $(".difficulty").removeClass("selected");
    $(this).addClass("selected");
    difficulty = this.id;

    setDifficultyTime(difficulty);
    await generatePokemonCards(difficulty);
    resetGameUI();
  });

  $("#start_button").on("click", async function () {
    $(this).hide();
    $("#game_stats").show();
    $("#game_grid").show();
    $("#theme_buttons").show();

    gameActive = true;

    await generatePokemonCards(difficulty);

    firstCard = undefined;
    secondCard = undefined;
    matchedPairs = 0;
    clicks = 0;
    timePassed = 0;
    lock = false;

    $(".card").removeClass("flip");
    updateStats();
    updateTimePassedDisplay(0);
    bindCardClick();
    startTimer();
    scheduleRandomPowerUp();
  });

  $("#reset_button").on("click", function () {
    resetGameUI();
  });
}

$(document).ready(setup);
