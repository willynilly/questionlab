var PickUser = {
	usernames: ['Ania', 'Dagmara'],
	experimentUrl: 'http://127.0.0.1:8000/experiment.html',
	
	start: function() {
		$('#pick_user_form').append('<fieldset id="pick_user_fieldset" class="center"><legend>Users</legend></fieldset>')
		
		for(var i = 0; i < PickUser.usernames.length; i++) {
			var username = PickUser.usernames[i];
			$('#pick_user_fieldset').append('<p><input type="radio" name="username" value="' + username + '">' + username + '</p>');
		}
		$('#pick_user_form').append('<p><input type="submit" value="Pick User" /></p>');
	    $('#pick_user_form').on('submit', function(e) {
		   // prevent the form from submitting
		   e.preventDefault();  //prevent the form from submitting
       		   
		   // get form data
		   var data = getJsonFromForm('pick_user_form');
		   logg(data); //use the console for debugging, F12 in Chrome, not alerts
		   
		   $.cookie('username', data['username'], { path: '/' });
			
		   window.location.href = PickUser.experimentUrl;
		});
	}
}

$(function() {
  				
	// Pick the user
	PickUser.start();
	
});