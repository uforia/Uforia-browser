// index.js
var search = function() {
    var search_query = $('search_query');
    // Focus search box.
    search_query.focus();

    var search_button = $('search_button');
    var results = $('results');
    var facets = $('facets');
    var result_page_number = 0;

    // 
    var fileNameFacetBoxElement = $('zip_file_names');
    var totalFilesFacetBoxElement = $('zip_total_files');
    var zipStoredFacetBoxElement = $('zip_stored');
    var zipDeflatedFacetBoxElement = $('zip_deflated');
    var zipDebugFacetBoxElement = $('zip_debug');
    var zipCommentFacetBoxElement = $('zip_comment');
    var zipContentFacetBoxElement = $('zip_contentInfo');

    // same as the facets
    var filter = {
        'zip_file_names' : '',
        'zip_total_files' : '',
        'zip_stored' : '',
        'zip_deflated' : '',
        'zip_debug' : '',
        'zip_comment' : '',
        'zip_contentInfo' : ''
    }
    // Order results.
    var order = {
        'field' : '',
        'order' : ''
    }

    var facet_search = {
        'zip_content_info' : '',
        'zip_file_names' : '',
    }

    var searchquery = function(clearResult) {
        if (clearResult) {
            results.set('html', '');
            result_page_number = 0;
        }
        // Reset facet search
        facet_search.content_info = '';
        facet_search.file_names = '';

        // file name filter.
        var fileName_filter = '';
        if (filter.zip_file_names.length > 0) {
            fileName_filter = '&zip_file_names=' + filter.file_names;
        }
        // total files filter.
        var total_files_filter = '';
        if (filter.zip_total_files.length > 0) {
            total_files_filter = '&zip_total_files=' + filter.total_files;
        }
        // zip_stored filter.
        var zip_stored_filter = '';
        if (filter.zip_stored.length > 0) {
            zip_stored_filter = '&zip_stored='
                + filter.zip_stored;
        }
        // zip_deflated filter.
        var zip_deflated_filter = '';
        if (filter.zip_deflated.length > 0) {
            zip_deflated_filter = '&zip_deflated='
                + filter.zip_deflated;
        }
        // debug filter.
        var zip_debug_filter = '';
        if (filter.zip_debug.length > 0) {
            zip_debug_filter = '&zip_debug='
                + filter.zip_debug;
        }
        // comment filter.
        var zip_comment_filter = '';
        if (filter.zip_comment.length > 0) {
            zip_comment_filter = '&zip_comment='
                + filter.zip_comment;
        }                                   
        // contentInfo filter.
        var zip_contentInfo_filter = '';
        if (filter.zip_contentInfo.length > 0) {
            zip_contentInfo_filter = '&zip_contentInfo='
                + filter.zip_contentInfo;
        }

        // Order results
        var field_order = '';
        if (order.field.length > 0 && (order.order == 'asc' || order.order == 'desc')) {
            field_order = '&field_order=' + order.field + '&order=' + order.order;
        }

        
        searchRequest.send ('q=' + search_query.get('value') + '&p='
                + result_page_number
                + fileName_filter + total_files_filter
                + zip_stored_filter + zip_deflated_filter
                + zip_comment_filter + zip_comment_filter
                + zip_contentInfo_filter
                + field_order
                );
   };

    // Search in facets.
    var search_facet_box_id = '';
    var searchFacet = new Request.JSON({
        url : '/elasticsearch/facets/',
        method : 'get',
        link : 'cancel',
        onRequest : function() {
        // Show facet loader.
            $(search_facet_box_id).set('html', '');
            },
            onComplete : function(json) {
            // Set new facets.
                switch (search_facet_box_id) {
                case 'zip_file_names':
                    setfileNamesFacets(json);
                    $('search_filenames_value').focus();
                    tmpStr = $('search_filenames_value').get('value');
                    $('search_filenames_value').set('value', '');
                    $('search_filenames_value').set('value', tmpStr);
                    break;

                case 'zip_total_files':
                    setTotalFilesFacets(json);
                    $('search_totalFiles_value').focus();
                    tmpStr = $('search_totalFiles_value').get('value');
                    $('search_totalFiles_value').set('value', '');
                    $('search_totalFiles_value').set('value', tmpStr);
                    break;
                }
            }
    });


// SET totalFiles ENTRIES IN FACET LIST.
var setTotalFilesFacets = function(json) {

    totalFilesFacetBoxElement.set('html', '&nbsp;');

    // totalFiles facet.
    if ($chk(json.facets) && $chk(json.facets.totalFiles)) {
        // Title element.
        var totalFilesFacetTitleElement = new Element('h2',
                {
                'html' : 'totalFiles'
                });
        // Reset element.
        var totalFilesFacetResetElement = new Element(
                'span', {
                'html' : '(reset)',
                'class' : 'reset_facet'
                });
        // Show reset element only if filter is set.
        if (filter.zip_total_files.length > 0) {
            totalFilesFacetResetElement
                .inject(totalFilesFacetTitleElement);
        }
        totalFilesFacetTitleElement
            .inject(totalFilesFacetBoxElement);
        // Facet elements.
        json.facets.totalFiles.terms.each(function(entry) {
                var facetElement = new Element('div', {
                    'class' : 'facetentry'
                    });
                var labelElement = new Element('a', {
                    'class' : 'label',
                    'type' : 'totalFiles',
                    'html' : entry.term + ' (' + entry.count
                        + ')',
                        'facet' : entry.term
                        });
                    labelElement.inject(facetElement);
                    facetElement.inject(totalFilesFacetBoxElement);
                    });

                // Make totalFiles facet clickable.
                $$('#totalFiles a.label').addEvent('click',
                    function(event) {
                    event.stop();
                    // Set totalFiles filter
                    filter.totalFiles = this.get('facet');
                    // alert(filter.totalFiles);
                    // Update results
                    searchquery(true);
                    });
    }

};

var setFileNameFacets = function(json) {

    fileNameFacetBoxElement.set('html', '&nbsp;');

    // Receiver to domain facet.
    if ($chk(json.facets)
            && $chk(json.facets.file_names)) {

        // Title element.
        var fileNameFacetTitleElement = new Element(
                'h2', {
                'html' : 'File Names'
                });
        // Reset element.
        var fileNameFacetResetElement = new Element(
                'span', {
                'html' : '(reset)',
                'class' : 'reset_facet'
                });
        // Show reset element only if filter is set.
        if (filter.zip_file_names.length > 0) {
            fileNameFacetResetElement
                .inject(fileNameFacetTitleElement);
        }
        fileNameFacetTitleElement
            .inject(fileNameFacetBoxElement);
        // Facet elements.
        json.facets.file_names.terms
            .each(function(entry) {
                    var facetElement = new Element('div', {
                        'class' : 'facetentry'
                        });
                    var labelElement = new Element('a', {
                        'class' : 'label',
                        'type' : 'zip_file_names',
                        'html' : entry.term + ' ('
                            + entry.count + ')',
                            'facet' : entry.term
                            });
                        labelElement.inject(facetElement);
                        facetElement
                        .inject(fileNameFacetBoxElement);
                        });
                    // Facet search.
                    var searchfileNameBoxElement = new Element('div', {
                        'class' : 'facetsearchbox'
                        });
                    var searchfileNameInputElement = new Element('input', {
                        'type' : 'text',
                        'id' : 'search_fileName_value',
                        'value' : facet_search.file_name
                        });
                    var searchfileNameButtonElement = new Element('input', {
                            'type' : 'button',
                            'id' : 'search_fileName',
                            'value' : 'Search'
                            });
                    searchfileNameInputElement.inject(searchfileNameBoxElement);
                    searchfileNameButtonElement.inject(searchfileNameBoxElement);
                    searchfileNameBoxElement.inject(fileNameFacetBoxElement);

                    // Make receiver to domain facet clickable.
                    $$('#file_name a.label').addEvent(
                            'click',
                            function(event) {
                            event.stop();
                            // Set receiver.to_domain filter
                            filter.zip_file_names = this
                            .get('facet');
                            // Update results
                            searchquery(true);
                            });
                    // Make facetsearch working.
                    $('search_fileName').addEvent('click',
                            function(event) {
                            event.stop();
                            search_facet_box_id = 'file_names';
                            facet_search.file_name = $('search_fileName_value').get('value');
                            searchFacet.send('type=file_name&value=' + $('search_fileName_value').get('value'));
                            });
                    $('search_fileName_value').addEvent('keyup',
                            function(event) {
                            event.stop();
                            search_facet_box_id = 'file_names';
                            facet_search.file_name = this.get('value');
                            searchFacet.send('type=file_name&value=' + this.get('value'));
                            });
    }
};

var searchRequest = new Request.JSON({
    url : '/elasticsearch/api/search/',
    method : 'get',
    link : 'cancel',
    onRequest : function() {
    $('next_page').addClass('hide');
    $('loader').removeClass('hide');
    },
    onComplete : function(json) {

        $('next_page').removeClass('hide');
        $('loader').addClass('hide');


        // Show total number of hits.
        $('total_results').set('html', json.hits.total + ' zip files found for the given searchquery.')

        // Add results
        if (json.hits.hits.length > 0) {
        json.hits.hits
            .each(function(hit) {
                    // Sender
                    //alert(hit._source.files_names);
                    var FileNameElement = new Element('span', {
                        'class' : 'zip_file_names',
                        'html' : '<label>File name:</label>' + hit._source.files_names + '&nbsp;' 
                        });
                    var FileNameElementAbstract = new Element('span', {
                        'class' : 'zip_file_names',
                        'html' : hit._source.files_names + '&nbsp;'
                    });

                    // contentInfo
                    var ZIPcontentInfo = String(hit._source.contentInfo); 
                    var ZIPcontentInfoElement = new Element('span', {
                        'class' : 'zip_contentInfo',
                        'html' : '<label>Content:</label>' + hit._source.contentInfo + '&nbsp;' 
                        });


                    // Result Box Entries
                    var messageBoxElement = new Element('div', {
                        'class' : 'message_box'
                        });

                    // Abstract
                    var abstractElement = new Element('div', {
                            'id' : 'message' + hit._id,
                            'class' : 'abstract show'
                            });
                    FileNameElementAbstract.inject(abstractElement);
                    abstractElement.inject(messageBoxElement);
                    // inject into dev
                    messageBoxElement.inject(results);


            });

        } else {
            window.removeEvents('scroll');
            $('next_page').addClass('hide');
        }

        // Set Content Facets
        //setContentInfoFacets(json);
        // File name Facets
        setFileNameFacets(json);
        // Total Files Facets
        setTotalFilesFacets(json);


        // Reset facet
        $$('.reset_facet').addEvent(
                'click',
                function(event) {
                event.stop();
                // Get facet type
                var facet_type = this.getParent()
                .getParent().get('id');
                switch (facet_type) {
                case 'zip_file_names':
                filter.zip_file_names = '';
                break;
                case 'zip_contentInfo':
                filter.zip_contentInfo = '';
                break;
                case 'zip_totalFiles':
                filter.zip_total_files = '';
                break;
                default:
                break;
                }
                searchquery(true);
                });

        result_page_number++;
        }

});

// Order result buttons.
$('order_selection').addEvent('change', function(event) {
        event.stop();
        switch(this.get('value')) {
        case 'name_asc':
        order.field = 'zip_file_names';
        order.order = 'asc';
        break;
        case 'name_desc':
        order.field = 'zip_file_names';
        order.order = 'desc';
        break;
        default:
        order.field = '';
        order.order = '';
        break;
        }
        searchquery(true);
        });

search_button.addEvent('click', function(event) {
        event.stop();
        // Send search request.
        searchquery(true);
        });

search_query.addEvent('keyup', function(event) {
        if (event.key == "enter") {
        event.stop();
        // Send search request.
        searchquery(true);
        }
        }).addEvent('domready', function() {
            // Send search request.
            searchquery(true);
            });

$('next_page').addEvent('click', function(event) {
        event.stop();
        searchquery(false);
        });
window.addEvent('scroll', function() {
        if (window.getScroll().y + window.getSize().y == document
            .getScrollSize().y - 0) {
        // Send search request.
        searchquery(false);
        }
        });

};

