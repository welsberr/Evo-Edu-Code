/********************************************
 * weasel.js
 * Weasel logic + Node-compatible exports.
 ********************************************/

/* 
  If you’re strictly in a browser environment without a bundler,
  you can still define a global variable to store references for 
  the front-end to access. For Node tests, we do module.exports 
  to export them. 
*/

(function(global) {
    /************************************************
     * GLOBAL / MODULE-LEVEL VARIABLES & CONSTANTS *
     ************************************************/
    let DEBUG = true; 
    let simulationInterval = null;   // Interval reference for stopping
    let generationCount = 0;         // Track which generation we’re on
    let bestCandidate = "";          // Global best string so far
    let bestFitness = 0;            // Fitness of the global best
    let previousGenerationBest = 0;  // Best fitness from the previous generation
    let stepbacks = 0;              // Count how many times local best gets worse
    const possibleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";

    // DOM references (will be assigned in initializeWeaselUI)
    let targetInput, popSizeInput, mutationRateInput;
    let startBtn, stopBtn;
    let currentGenerationEl, bestMatchEl, stepbacksCountEl, plotDiv;

    /*****************************************************
     * 1. FUNCTION: Generate a random string of length.  *
     *****************************************************/
    function generateRandomString(length) {
	let result = "";
	for (let i = 0; i < length; i++) {
	    const index = Math.floor(Math.random() * possibleChars.length);
	    result += possibleChars.charAt(index);
	}
	if (false && DEBUG) {
	    // console.log("generateRandomString", result);
	}
	return result;
    }

    /******************************************************
     * 2. FUNCTION: Calculate how many characters match   *
     *    exactly between a candidate and target.         *
     ******************************************************/
    function calculateFitness(candidate, target) {
	let score = 0;
	for (let i = 0; i < target.length; i++) {
	    if (candidate[i] === target[i]) {
		score++;
	    }
	}
	/*
	if (false && DEBUG) {
	    // console.log("calculateFitness", candidate, target, "->", score);
	} */
	return score;
    }

    /****************************************************************
     * 3. FUNCTION: Mutate a parent string at a given percentage.    *
     *    Each character has 'mutationRate' % chance to change.      *
     ****************************************************************/
    function mutate(parent, mutationRate) {
	let child = "";
	for (let i = 0; i < parent.length; i++) {
	    if (Math.random() * 100 < mutationRate) {
		const index = Math.floor(Math.random() * possibleChars.length);
		child += possibleChars.charAt(index);
	    } else {
		child += parent[i];
	    }
	}
	if (false && DEBUG) {
	    // console.log("mutate", parent, mutationRate, "->", child);
	}
	return child;
    }

    /*************************************************************
     * 4. FUNCTION: Initialize a population of random strings.   *
     *************************************************************/
    function initializePopulation(popSize, targetLength) {
	const population = [];
	for (let i = 0; i < popSize; i++) {
	    population.push(generateRandomString(targetLength));
	}
	
	if (false && DEBUG) {
	    // console.log("initializePopulation(", popSize, targetLength, ") ->", population);
	}
	return population;
    }
    
    /****************************************************************************
     * 5. FUNCTION: Evolve a population one generation forward.                 *
     *    - Mutate each individual to form newPopulation.                       *
     *    - Identify the best individual, swap it into index 0.                 *
     *    - Return both the new population and the best fitness found.          *
     ****************************************************************************/
    function evolvePopulation(population, target, mutationRate) {
	const newPopulation = [];
	
	// Mutate best individual of previous generation
	for (let i = 0; i < population.length; i++) {
	    newPopulation.push(mutate(population[0], mutationRate));
	}
	
	// Find local best
	let bestIndex = 0;
	let generationBestFitness = calculateFitness(newPopulation[0], target);

	for (let i = 1; i < newPopulation.length; i++) {
	    let f = calculateFitness(newPopulation[i], target);
	    if (f > generationBestFitness) {
		generationBestFitness = f;
		bestIndex = i;
	    }
	}

	// Swap best into position 0
	[newPopulation[0], newPopulation[bestIndex]] = [
	    newPopulation[bestIndex],
	    newPopulation[0]
	];
	
	if (false && DEBUG) {
	    console.log("evolve_population(", population, target, mutationRate, ") ->",
			newPopulation, generationBestFitness );
	}
	
	return { newPopulation, generationBestFitness };
    }

    /*************************************************************
     * 6. FUNCTION: Add a box-plot trace for the current         *
     *    generation's distribution of fitness.                  *
     *************************************************************/
    function plotGenerationData(genNumber, population, target) {
	const fitnessArray = population.map(ind => calculateFitness(ind, target));
	const newTrace = {
	    y: fitnessArray,
	    type: "box",
	    name: "Gen " + genNumber
	};
	Plotly.addTraces(plotDiv, [newTrace]);
    }

    /*********************************************
     * 7. FUNCTION: Update the DOM display.      *
     *********************************************/
    function updateDisplay() {
	currentGenerationEl.innerText = "Current Generation: " + generationCount;
	bestMatchEl.innerText = "Best Match So Far: " + bestCandidate;
	stepbacksCountEl.innerText = "Stepbacks: " + stepbacks;
    }

    /*********************************************
     * 8. FUNCTION: Initialize the Plotly figure *
     *********************************************/
    function initializePlot() {
	Plotly.newPlot(plotDiv, [], {
	    title: "Distribution of Correct Characters"
	});
    }
    
    /*********************************************************
     * 9. FUNCTION: Start Simulation.                        *
     *    - Reads UI inputs, resets counters, builds initial *
     *      population, sets up interval to evolve.          *
     *********************************************************/
    function startSimulation() {
	if (simulationInterval !== null) return; // Don't start if already running

	// Initialize or reset everything
	generationCount = 0;
	bestCandidate = "";
	bestFitness = 0;
	previousGenerationBest = 0;
	stepbacks = 0;

	// Clear plot
	initializePlot();

	// Get user inputs
	const target = targetInput.value.toUpperCase();
	const popSize = parseInt(popSizeInput.value, 10) || 100;
	const mutationRate = parseFloat(mutationRateInput.value) || 5;

	// Make initial population
	let population = initializePopulation(popSize, target.length);
	console.log("gen.", generationCount, "best", bestCandidate, "best fit", bestFitness, "prevBest", previousGenerationBest, 'stepbacks', stepbacks);
	console.log(population);
	
	// Set up evolving loop
	simulationInterval = setInterval(() => {
	    generationCount++;
	    
	    const { newPopulation, generationBestFitness } = 
		  evolvePopulation(population, target, mutationRate);
	    
	    // Check for stepback
	    if (generationCount > 1 && generationBestFitness < previousGenerationBest) {
		stepbacks++;
	    }
	    previousGenerationBest = generationBestFitness;

	    // Update global best if needed
	    if (generationBestFitness > bestFitness) {
		bestFitness = generationBestFitness;
		bestCandidate = newPopulation[0]; // best is at index 0
	    }

	    console.log("gen.", generationCount, "best", bestCandidate, "best fit", bestFitness, "prevBest", previousGenerationBest, 'stepbacks', stepbacks);
	    console.log(population);

	    // Plot distribution
	    plotGenerationData(generationCount, newPopulation, target);

	    // Update UI
	    updateDisplay();
	    
	    // Replace old population
	    population = newPopulation;
	    
	    // Stop if we've matched the target
	    if (bestCandidate === target) {
		stopSimulation();
	    }
	    
	}, 100); // 100ms per generation
    }
    
    /***********************************************
     * 10. FUNCTION: Stop Simulation (clear timer) *
     ***********************************************/
    function stopSimulation() {
	if (simulationInterval !== null) {
	    clearInterval(simulationInterval);
	    simulationInterval = null;
	}
    }
    
    /****************************************************************
     * 11. FUNCTION: initializeWeaselUI - Called from index.html     *
     *     on page load. Hooks up DOM elements & event listeners.    *
     ****************************************************************/
    function initializeWeaselUI() {
	// Grab references to DOM elements
	targetInput         = document.getElementById("targetInput");
	popSizeInput        = document.getElementById("popSizeInput");
	mutationRateInput   = document.getElementById("mutationRateInput");
	startBtn            = document.getElementById("startBtn");
	stopBtn             = document.getElementById("stopBtn");
	currentGenerationEl = document.getElementById("currentGeneration");
	bestMatchEl         = document.getElementById("bestMatch");
	stepbacksCountEl    = document.getElementById("stepbacksCount");
	plotDiv             = document.getElementById("plotDiv");
	
	// Button event handlers
	startBtn.addEventListener("click", startSimulation);
	stopBtn.addEventListener("click", stopSimulation);
	
	// Initialize an empty plot at the outset
	initializePlot();
    }
    
    // Attach these functions to the global scope for the browser
    // (So index.html can call initializeWeaselUI)
    // initializeWeaselUI();
    global.initializeWeaselUI = initializeWeaselUI;
    
    // Node.js exports - for test suite
    if (typeof module !== "undefined" && module.exports) {
	module.exports = {
	    generateRandomString,
	    calculateFitness,
	    mutate,
	    initializePopulation,
	    evolvePopulation
	    // You could export startSimulation, etc. as needed, but these five
	    // are the main "core" functions for testing.
	};
    }

})(this);

