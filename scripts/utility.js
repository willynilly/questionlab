// global utility functions
function logg(s) {
	console.log(s);
}

function getJsonFromForm(formId) {
	   var o = {};
	   var a = $("#" + formId).serializeArray();
	   $.each(a, function() {
	       if (o[this.name]) {
	           if (!o[this.name].push) {
	               o[this.name] = [o[this.name]];
	           }
	           o[this.name].push(this.value || '');
	       } else {
	           o[this.name] = this.value || '';
	       }
	   });
	   return o;
}