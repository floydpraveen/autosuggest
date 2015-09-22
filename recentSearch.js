/*
jQuery Plugin for autosuggest, which shows recent searhes on focus of input.
Searched terms wil be pushed to local storage, and showed wehn user focuses on input 

abbreviations
ac - auto complete
*/



(function($){
	//wrapper for localStorage to save json objects and fetch
	var LocalStorageAPI = function( config ){
		return {
		 	key : "unbxdRecentSearch",
		 	//flag for rendered widget and data in local storage are same, so we dont fetch again
		 	isDirty : true, 
		    //check if local storage supported by browser
		    isSupported: function() {
		        return window.localStorage;
		    },
		 
		    push: function(  obj ) {

		    	if(!obj || !obj.label || !this.isSupported)
		    		return;

		    	var recentSearches = this.get() || [];
		 		recentSearches.unshift(obj);
		    	for(var k=1; k<recentSearches.length; k++){
		    		if(recentSearches[k].label === obj.label )
		    			recentSearches.splice(k,1);
		    	};
		    	if(recentSearches.length > config.maxItems)
		    		recentSearches.length = config.maxItems;
		    	this.isDirty = true;
		        localStorage.setItem( this.key, JSON.stringify(recentSearches));
		    },
		 
		    get: function() {
		    	if(!this.isSupported)
		    		return;
		    	this.isDirty = false;
		    	var value = localStorage.getItem( this.key );
	    		return value && JSON.parse(value);
		    },

		    //return true if data present
		    data:function() {
		    	if(!this.isSupported)
		    		return false;

		    	var value = localStorage.getItem( this.key );
	    		return value && JSON.parse(value).length;
		    },
		 
		    clearAll: function() {
		    	this.isDirty = true;
		        localStorage.clear();
		    }
		}
	};

	

	$.fn.recentSearch = function( config ){
		var defaultConfigs = {
			maxItems:5,
			wrapperClass:"searchbox-wrapper",
			inputClass : "ac_input",
			widgetClass : "ac_recent_searches",
			headerClass : "ac_rs_heading",
			clearClass : "ac_rs_clear",
			heading : "RECENT SEARCHES",
			clearMsg : "CLEAR"
		};

		var config = $.extend({}, defaultConfigs, config);
		
		var KEY = {
			UP: 38,
			DOWN: 40,
			RETURN: 13,
			ESC: 27
		};

		var CLASSES = {
			ACTIVE: "unbxd-ac-over",
			HOVER: "unbxd-ac-hover",
			EVEN:"unbxd-ac-even",
			ODD:"unbxd-ac-odd"
		};

		var resultClass = $.Autocompleter && $.Autocompleter.defaults && $.Autocompleter.defaults.resultsClass || "unbxd-ac-results",
			widget,
			element,
			list,
			input = config.inputSelector,
			inputElement = this[0],
			$input = this.first(),
			localStorageAPI = LocalStorageAPI(config);
			

		//show widget on click or focus of on input
		$input.bind("click focus", function( event ){
			if( inputValue() === true || !localStorageAPI.data() )
				return;

			if(localStorageAPI.isDirty){
				var recentSearches = localStorageAPI.get();
				if(!recentSearches || !recentSearches.length)
					return
				render(recentSearches);
			}

			showWidget();
		});

		//on enter on input push the term to storage
		$input.bind("keydown", function( event ){
			if(event.keyCode === KEY.RETURN ){
				getData();
			}	
		});

		//hide on blur
		$input.blur(function(){
			hideWidget();
		});

		//hide when clicked outside
		$(document).click(function( event ){
			if($(event.target).parents("."+config.wrapperClass).length == 0 )
				hideWidget();
		});
        
        //on click of any typeahead suggestion push that to storage
        $( "div."+config.wrapperClass ).delegate("div."+resultClass+" li", "click", function( event ){
        	getData();
        });
     
		// only opera doesn't trigger keydown multiple times while pressed, others don't work with keypress at all
		$input.bind(($.browser.opera ? "keypress" : "keyup") + ".autocomplete", function(event) {
			if(isWidgetActive() === false)
				return;
			switch(event.keyCode) {
			
				case KEY.UP:
					moveSelect(-1);
					break;
					
				case KEY.DOWN:
					moveSelect(1);
					break;
					
				case KEY.RETURN:
			    	event.preventDefault();
					onSelect();
					break;
					
				case KEY.ESC:
					hideWidget();
					break;
					
				default:
					if( inputValue() === true )
						hideWidget();
					break;
			}
		});

	(function init() {
        widget = $("<div/>")
        		.html('<div class="'+config.headerClass+'"><span>'+ config.heading +'</span><span class="'+config.clearClass+'">'+config.clearMsg+'</span></div>')
				.hide()
				.addClass( resultClass )
				.addClass( config.widgetClass )
				.css({"position":"absolute","font-weight":"normal"})
				.insertAfter('.'+ config.inputClass);

		list = $("<ul/>").appendTo(widget)
			.mouseover( function(event) {
			if(getNode(event).nodeName && getNode(event).nodeName.toUpperCase() == 'LI') {
				list.find('.'+CLASSES.ACTIVE).removeClass(CLASSES.ACTIVE);
			    $(getNode(event)).addClass(CLASSES.ACTIVE);            
	        }
		}).click(function(){
			onSelect();
		}).mousedown(function() {
			config.mouseDownOnSelect = true;
		}).mouseup(function() {
			config.mouseDownOnSelect = false;
		});

		//handle click on headers
		widget.find("div."+ config.headerClass ).mousedown(function( event ){
			if( $(event.target).hasClass( config.clearClass ) ){
				config.mouseDownOnSelect = false;
				localStorageAPI.clearAll();
				hideWidget()
			}else{
				config.mouseDownOnSelect = true;
			}
		}).mouseup(function() {
			config.mouseDownOnSelect = false;
		});

	})();

	//get data from dom and push to local storage
	function getData(){
		$(getNode(event)).addClass(CLASSES.ACTIVE);
		var $autocomplete = $("div."+config.wrapperClass+ "> div."+ resultClass).first(),
			$list = $autocomplete.find(" > ul > li"),
			subResultSelected = $autocomplete.find("li ul ."+CLASSES.ACTIVE) ,
			selected = null,
			data = null,
			subData = null,
			subDataIndex,
			obj = {};

	    if( isWidgetActive() ){
			selected = list.find("li."+CLASSES.ACTIVE).first();
			obj.label = selected.attr("data-label");
			obj.url   = selected.attr("data-url");
		}else if(  $list.filter("."+CLASSES.ACTIVE).length > 0  ){
			selected = $list.filter("."+CLASSES.ACTIVE);
			data = $.data(selected[0], "ac_data").data;
			obj.label = data[0];
			obj.url   = data[2];
		}else if(subResultSelected.length == 1) {
			selected = $(subResultSelected).parent().parent("li");
			data = $.data(selected[0], "ac_data").data;
			subDataIndex = $autocomplete.find("li ul li").index(subResultSelected);
			subData = data[3][subDataIndex];
			obj.label = data[0] +" "+ subData.subLabel ;
			obj.url   = data[2];
			obj.inField = subData;
		}else if($input && $input.val() && $input && $input.val().trim().length){
			obj.label =  $input.val().trim();
			obj.url   =  false;
		}

		if(obj.label)
			localStorageAPI.push(obj);
	};

	function showWidget(){
		widget.css({
			width: $input.width() + 7,
            top: inputElement.offsetHeight + 16,
			left: inputElement.offsetLeft - 5
		}).show();
	};

	function hideWidget(){
		if(!config.mouseDownOnSelect){
			list && list.find("li").removeClass(CLASSES.ACTIVE);
			widget && widget.hide();
		}
	};

	//returns true if recent search widget active and any item is slected
	function isWidgetActive(){
		if(widget && widget.is(":visible") && list && list.find("."+CLASSES.ACTIVE))
			return true;

		return false;
	};

	//returns true if input has a value
	function inputValue(){
		var inputValue = $input.val() &&  $input.val().trim();
		return inputValue.length > 0;
	};

	function render( data, container) {
		list.empty();
		for (var i=0; i < data.length; i++) {	
			var dataObj = data[i];
			var li = $("<li/>").html("<span>"+ dataObj.label +"</span>").addClass(i%2 == 0 ? CLASSES.EVEN : CLASSES.ODD);
			li.attr('data-label', dataObj.label );
			li.attr('data-url', dataObj.url );
			list.append(li);
		}
	};

	function getNode(event) {
		var element = event.target;
		while(element && element.tagName != "LI")
			element = element.parentNode;
		// more fun with IE, sometimes event.target is empty, just ignore it then
		if(!element)
			return [];
		return element;
	};

	function moveSelect(step) {
		var listItems,
			activeElemnet,
			nextElement,
			index;
		listItems = widget.find("ul > li");
		activeElemnet = listItems.filter("." + CLASSES.ACTIVE)[0];
		if(activeElemnet){
			$(activeElemnet).removeClass(CLASSES.ACTIVE);
			index = listItems.index(activeElemnet) + step;
			if(index < listItems.length && index >= 0)
				nextElement = listItems[index];
			else if(index < 0 )
				nextElement = listItems.last(); 
			else if(index >= listItems.length)
				nextElement = listItems.first();
		}else{
			if(step < 0 )
				nextElement = listItems.last();
			else
				nextElement = listItems.first();
		}

		$(nextElement).addClass(CLASSES.ACTIVE);
    };

    //on select of a recent search
    function onSelect(){
    	if( isWidgetActive() ){
    		var selected = list.find("."+CLASSES.ACTIVE) && list.find("."+CLASSES.ACTIVE),
    			url = selected.attr("data-url");
    			
    		$input.val(selected.attr("data-label"));
    		if(url && url != "false"){
    			window.location = url;
    		}else{
    			$input.parents("form").submit();
    		}	
    	}
    };

};//end

})(jQuery);


//USING THIS Plugin
var configs = {
    maxItems:8, //no of recent search items
    wrapperSelector:"searchbox-wrapper" // selctor for div which surrounds AC results
};
$( ".ac_input" ).recentSearch(configs);