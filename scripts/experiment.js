// global variables
var Experiment = {
	
	logUrl: 'file:///Users/will/Work/Maciej/logdata.php', // the url which receives periodic experimental data via POST  
	nextUrl: 'file:///Users/will/Work/Maciej/pickuser.html', // the url after the experiment concludes
	
	questions: [], // (should be [], should not be configured) 
	questionIndex: 0, // (should 0, should not be configured) the current question index
	lastViewedQuestionIndex: 0, // (should be 0, should not be configured)  the index of the last question viewed by the user
	experimentDuration: 1300, //  (should be 1300) in seconds
	questionMinRandomNumber: 10, // (should be 10) the minimum value for a random number in a random number flash card question
	questionMaxRandomNumber: 99, // (should be 99) the maximum value for a random number in a random number flash card question
	
	logTimerDuration: 10, // (should be 10) in seconds.  The duration of time until the experiment data is periodically logged
	logTimerId: 0, // (should be 0, should not be manually configured) the timer id of the logger, which is used by clearInterval
	logToServer: true, // (should be true) whether the log data should be posted to the server at logUrl
	logToConsole: false, // (should be false for production, true for debuggin) whether to print the log data to the browser console using logg()
	
	timerFormat: 'S', // (should be 'S') 'S' == Seconds, 'M' == Minutes there are more settings specified in jquerycountdown
	primeTextTimerDuration: 5, // (should be 20) in seconds. the maximum duration the prime text should be flashed in front of the user
	offerAnswerTimerDuration: 5, // (should be 20) in seconds. the maximum duration the user should have to answer a question
   afterAnswerTimerDuration: 5, // (should be 20) in seconds. the amount of time the user must wait after they have answered a question.
								 		  // if they answer the question correctly, the experiment timer will be paused for this duration
	
	isDisplayedPrimeTextTimer: false, // (should be false) whether the question_timer is displayed when the user is primed with a random number
	isDisplayedOfferAnswerTimer: true, // (should be true) whether the question_timer is displayed when the user is answering a question
	isDisplayedAfterAnswerTimer: false, // (should be false)  whether the question_timer is displayed directly after a user has answered a question
	
	radioButtonQuestionConfigs: [
		{
			'form_input_name': 'q1', 
			'question_text':'Q1?', 
			'answer_option_texts': ['option 1', 'option 2', 'option 3', 'option 4', 'option 5'],
			'offer_answer_timer_duration': 5, // seconds (should be 20 )
			'after_answer_timer_duration': 0, // seconds (should be 0)
		},
		{
			'form_input_name': 'q2', 
			'question_text':'Q2?', 
			'answer_option_texts': ['option 1', 'option 2'],
			'offer_answer_timer_duration': 5,  // seconds (should be 20 )
			'after_answer_timer_duration': 0,  // seconds (should be 0 )
		},
	],
	
	startExperiment: function() {
		// Setup the experiment timer
		Experiment.setupTimer('#experiment_timer', Experiment.experimentDuration, Experiment.endExperiment);
		
		// Setup questions
		Experiment.setupQuestions();
		
		// Setup the log timer
		Experiment.setupLogTimer();
	
		// start asking questions, starting with the first question 
		Experiment.startQuestions();
	},

	endExperiment: function() {
		// log the experiment data
		data = Experiment.logExperiment();
	   			
		// destroy all the timers
		$('#experiment_timer').countdown('destroy');
		$('#question_timer').countdown('destroy');
		if (Experiment.logTimerId) {
			clearInterval(Experiment.logTimerId); // clears the log timer
		}
		
		// clear the quetion content
		$('#question_content').html('');	
	  
	  	// thank the participant and redirect them to another page
	   alert('Thank you for participating in the experiment!');
		window.location.href = Experiment.nextUrl;
	},
   
	setupQuestions: function() {
		// create the questions for the experiment
		Experiment.questions = QuestionFactory.createQuestions();
	},
	
	startQuestions: function() {
		Experiment.questionIndex = -1;
		Experiment.nextQuestion();
	},
		 
	nextQuestion: function() {
		// iterate to the next question
		Experiment.questionIndex += 1;
		
		// end the experiment when the last question is finished
		if (Experiment.questionIndex >= Experiment.questions.length) {
			// end the experiment
			Experiment.endExperiment();
			return;
		}
		
		// start the question
		var question = Experiment.questions[Experiment.questionIndex];
	   question.start();
	 },
	
	logExperiment: function() {		
		var experimentTimeLeft = $.countdown.periodsToSeconds($('#experiment_timer').countdown('getTimes'));
		
		var sdata = {
			'user': $.cookie('username'),
			'ecus': experimentTimeLeft, // in seconds
		}

		// determine the indexes of the different question types
		var flashCardQuestionIndexes = [];
		var radioButtonQuestionIndexes = [];
		for(var i=0; i<Experiment.questions.length; i++) {
			var question = Experiment.questions[i];
			if (question instanceof FlashCardQuestion) {
				flashCardQuestionIndexes.push(i);
			} else if (question instanceof RadioButtonQuestion) {
				radioButtonQuestionIndexes.push(i);
			}
		}

		// task1n = random number1 (-1, if not generated yet)
		// task1a = form1 (-1, if not inputted yet)
		// task1c = 1, if number1 == form1; 0, if number1 !=form1; -1, if not available yet

		for(var i=0; i < flashCardQuestionIndexes.length; i++) {			
			var j = flashCardQuestionIndexes[i];
			var question = Experiment.questions[j];
			var prefix = 'task' + (i+1);
			
			if (j <= Experiment.lastViewedQuestionIndex) {
				sdata[prefix + 'n'] = question.data['correct_answer'];
			} else {
				sdata[prefix + 'n'] = -1;
			}
			
			if (question.data['offered_answer'] != '') {
				sdata[prefix + 'a'] = question.data['offered_answer'];
			} else {
				sdata[prefix + 'a'] = -1;
			}
			
			if (sdata[prefix + 'a'] == -1 || sdata[prefix + 'n'] == -1) {
				sdata[prefix + 'c'] = -1;
			} else {
				if (sdata[prefix + 'a'] == sdata[prefix + 'n']) {
					sdata[prefix + 'c'] = 1;
				} else {
					sdata[prefix + 'c'] = 0;					
				}
			}
		}

		// q1 = answer to question 1 (1 for answer1, 2 for answer2, (…), 5 for answer5). -1 if no answer
		// q2 = answer to question 2 (1 for answer1, 2 for answer2).  -1 if no answer
		for(var i=0; i<radioButtonQuestionIndexes.length; i++) {
		
			var j = radioButtonQuestionIndexes[i];
			var question = Experiment.questions[j];
			var prefix = 'q' + (i+1);
			
			if (j <= Experiment.lastViewedQuestionIndex && question.data['offered_answer'] != '') {
				sdata[prefix] = question.data['offered_answer'];
			} else {
				sdata[prefix] = -1;
			}
		}
		
		// print the log data to the console if specified in the settings
		if (Experiment.logToConsole) {
			logg("logging data");
			logg(sdata);
		}

		// store the experiment data in a cookie
		$.cookie('experimentdata', JSON.stringify(sdata), { path: '/' });
		
		
		// send the data via ajax to the server
		if (Experiment.logToServer) {
			$.post(Experiment.logUrl, sdata);
		}
		
		return sdata;
	},
	
	createRandomNumber: function(minNumber, maxNumber) {
	    return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
	},

	setupTimer: function(domSelectorString, timerDuration, isDisplayed, timerEndsCallback) {
		$(domSelectorString).countdown('destroy');
	
		// set the deadline of the timer based on the timerDuration (seconds)
		var timerDeadline = new Date();
		timerDeadline.setSeconds(timerDeadline.getSeconds() + timerDuration);
		$(domSelectorString).countdown({until: timerDeadline, format: Experiment.timerFormat, onExpiry: timerEndsCallback});
		
		// hide or show the counter based on the isDisplayed option
		if (!isDisplayed) {
			$(domSelectorString).hide();
		} else {
			$(domSelectorString).show();		
		}
		
		// run the timer callback if the timerDuration is 0 or less
		if (timerDuration <= 0) {
			timerEndsCallback();
		}
	},

	setupLogTimer: function(){
		Experiment.logTimerId = setInterval(function() {
			Experiment.logExperiment();
		}, Experiment.logTimerDuration * 1000);	
	},
}

// question factory class
var QuestionFactory = {
    
	createQuestions: function() {
		var questions = [];

		// add 3 random number flash card questions
		questions.push.apply(questions, QuestionFactory.createRandomNumberFlashCardQuestions(3));

		// add radio button questions from experiment configs
		for(var i = 0; i < Experiment.radioButtonQuestionConfigs.length; i++) {
			var c = Experiment.radioButtonQuestionConfigs[i];
			questions.push(QuestionFactory.createRadioButtonQuestion(c['form_input_name'], 
																						c['question_text'], 
																						c['answer_option_texts'], 
																						c['offer_answer_timer_duration'], 
																						c['after_answer_timer_duration']));
		}

		// add 1 random number flash card question
		questions.push.apply(questions, QuestionFactory.createRandomNumberFlashCardQuestions(1));

		return questions; 
	},
   
	createRadioButtonQuestion: function(formInputName, questionText, answerOptionTexts, offerAnswerTimerDuration, afterAnswerTimerDuration) {
		var question = new RadioButtonQuestion();
		question.setup(formInputName, questionText, answerOptionTexts, offerAnswerTimerDuration, afterAnswerTimerDuration);
		return question;
	},
	 
	createRandomNumberFlashCardQuestions: function(questionCount) {
		var questions = [];	
		for(var i = 0; i < questionCount; i++) {
			question = QuestionFactory.createRandomNumberFlashCardQuestion();
			questions.push(question);
		}
		return questions;
	},
    
	createRandomNumberFlashCardQuestion: function() {
		var questionText = 'What was the number?';
		var correctAnswer = Experiment.createRandomNumber(Experiment.questionMinRandomNumber, Experiment.questionMaxRandomNumber);
		var primeText = correctAnswer;
		var question = new FlashCardQuestion();
		question.setup(primeText, 
						  questionText, 
						  correctAnswer, 
						  Experiment.primeTextTimerDuration, 
						  Experiment.offerAnswerTimerDuration,
					  	  Experiment.afterAnswerTimerDuration);
		return question;
	},

}

// radio button question class
function RadioButtonQuestion() {
	// public properties
	this.formInputName = '';
	this.data = {}
}
RadioButtonQuestion.prototype = {

	setup: function(formInputName, questionText, answerOptionTexts, offerAnswerTimerDuration, afterAnswerTimerDuration) {
	
		this.formInputName = formInputName;
		
		var data = {};
		data['offer_answer_timer_duration'] = offerAnswerTimerDuration;
		data['after_answer_timer_duration'] = afterAnswerTimerDuration;

		data['question_text'] = questionText;
		data['answer_option_texts'] = answerOptionTexts; // an array of answer texts
		data['offered_answer'] = '';
	
		this.data = data;
	},
   	     
	start: function() {
		this.ask();
	},
	
	ask: function() {	
	
		// add the question form
		this.addForm();
			
		//setup the timer for answering the question
		callback = function() {Experiment.nextQuestion();};
		Experiment.setupTimer('#question_timer', this.data['offer_answer_timer_duration'], Experiment.isDisplayedOfferAnswerTimer, callback);
	},
   
	addForm: function() {
		$('#question_content').html(this.createForm());
		
		// update last viewed question
		Experiment.lastViewedQuestionIndex = Experiment.questionIndex;
		
		// add the form submit button logic for when the user answers a question
		this.addFormSubmitLogic();
	},
	 
	createForm: function() {
		var data = this.data;
		var qHtml = '';
		qHtml += '<form id="question_form">';
		
		// add the radio button question
		var dHtml = '<fieldset>';
		dHtml += ('<legend>' + this.data['question_text'] + '</legend>');
		for(var j = 0; j < this.data['answer_option_texts'].length; j++) {
			var dOption = this.data['answer_option_texts'][j];
			var dOptionId = this.formInputName + '_' + j;
			dHtml += ('<input id="' + dOptionId + '" type="radio" name="answer" value="' + dOption + '" /><label for="' + dOptionId + '">' + dOption + '</label>');
		}
		dHtml += '</fieldset>';
		qHtml += dHtml;
		qHtml += '<input type="submit" value="Submit"/></form>';
		return qHtml;
	},
	
	addFormSubmitLogic: function() {
		
		var self = this;
		$('#question_form').on('submit', function(e) {
			   // prevent the form from submitting
			   e.preventDefault();  //prevent the form from submitting
           
			   // stop the question timer
			   $('#question_timer').countdown('destroy');		   
		   
			   // get form data
			   var fdata = getJsonFromForm('question_form');
		   
			   // save the user's answer to the question
			   self.data['offered_answer'] = fdata['answer'];
				
				// Take a break without stopping the global clock if after_answer_timer_duration is greater than 0.
			   if (self.data['after_answer_timer_duration'] > 0) {
				   $('#question_content').html('<p>' + self.data['after_answer_timer_duration'] + ' second break.</p>');
			   }
				
		   	//set up the question timer for after the question
		   	callback = function() {
					// resume the experiment timer if it was paused
					$('#experiment_timer').countdown('resume');
					// move on to the next question 
					Experiment.nextQuestion();
				};
			   Experiment.setupTimer('#question_timer', self.data['after_answer_timer_duration'], Experiment.isDisplayedAfterAnswerTimer, callback);		   
	    });	
	},
	     
};


// flash card class
function FlashCardQuestion() {
	// public properties
	this.data = {}
}
FlashCardQuestion.prototype = {

	setup: function(primeText, questionText, correctAnswer, primeTextTimerDuration, offerAnswerTimerDuration, afterAnswerTimerDuration) {
	
		var data = {};
		data['prime_text_timer_duration'] = primeTextTimerDuration;
		data['offer_answer_timer_duration'] = offerAnswerTimerDuration;
		data['after_answer_timer_duration'] = afterAnswerTimerDuration;

		data['correct_answer'] = correctAnswer;
		data['prime_text'] = primeText;
		data['question_text'] = questionText;
		data['offered_answer'] = '';
	
		this.data = data;
	},
   	     
	start: function() {
		this.prime();
	},

	prime: function() {
		
		// display the prime text
		$('#question_content').html('<p class="prime">' + this.data['prime_text'] + '</p>');
		$('.prime').unselectable(); // make the prime_text unselectable by the user so they can't copy and paste it
	
		// update last viewed question
		Experiment.lastViewedQuestionIndex = Experiment.questionIndex;
	
		//set up the timer for displaying the card
		var self = this;
		callback = function() {self.ask();};
		Experiment.setupTimer('#question_timer', this.data['prime_text_timer_duration'], Experiment.isDisplayedPrimeTextTimer, callback);	
	},
	
	ask: function() {	
	
		// add the question form
		this.addForm();
			
		//setup the timer for answering the question
		callback = function() {Experiment.nextQuestion();};
		Experiment.setupTimer('#question_timer', this.data['offer_answer_timer_duration'], Experiment.isDisplayedOfferAnswerTimer, callback);
	},
   
	addForm: function() {
		$('#question_content').html(this.createForm());
		
		// add the form submit button logic for when the user answers a question
		this.addFormSubmitLogic();
	},
	 
	createForm: function() {
		var qHtml = '';
		qHtml += '<form id="question_form">';
		qHtml += ('<p><label for="answer">' + this.data['question_text'] + '</label><br/>');
		qHtml += '<input type="text" name="answer"/></p>';
		qHtml += '<input type="submit" value="Submit"/></form>';
		return qHtml;
	},
	
	addFormSubmitLogic: function() {
		
		var self = this;
		$('#question_form').on('submit', function(e) {
			   // prevent the form from submitting
			   e.preventDefault();  //prevent the form from submitting
           
			   // stop the question timer
			   $('#question_timer').countdown('destroy');		   
		   
			   // get form data
			   var fdata = getJsonFromForm('question_form');
		   
			   // save the user's answer to the question
			   self.data['offered_answer'] = fdata['answer'];

			   // report to the user whether they got the answer correct or not.
			   // if their offered answer is the same as the correct answer 
			   // pause the experiment timer for the afterAnswerTimerDuration
			   // and then resume and then move on to the next question.
			   // Otherwise allow the experiment timer to continue for the the afterAnswerTimerDuration duration 
			   // and then move on to the next question
			   // in both cases, make the user wait for a afterAnswerTimerDuration duration before going to the next question.

			   if (self.data['offered_answer'] == self.data['correct_answer']) {
				   $('#experiment_timer').countdown('pause');
				   $('#question_content').html('<p>Correct!</p><p>' + self.data['after_answer_timer_duration'] + ' second break.</p>');
			   } else {
				   $('#question_content').html('<p>Incorrect!</p><p>' + self.data['after_answer_timer_duration'] + ' second break.</p>');
			   }
		   
		   	//set up the question timer for after the question
		   	callback = function() {
					// resume the experiment timer if it was paused
					$('#experiment_timer').countdown('resume');
					// move on to the next question 
					Experiment.nextQuestion();
				};
			   Experiment.setupTimer('#question_timer', self.data['after_answer_timer_duration'], Experiment.isDisplayedAfterAnswerTimer, callback);		   
	    });	
	},
	     
};

$(function() {
  				
	alert('Welcome ' + $.cookie('username') + '.  Click OK to begin the experiment.');
				
	// Start the experiment
	Experiment.startExperiment();
	
});