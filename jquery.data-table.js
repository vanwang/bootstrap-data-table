/*!
 * jQuery Data Table Plugin v0.1
 *
 * Author: Jeff Dupont
 * ==========================================================
 * Copyright 2012 iAcquire, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==========================================================
 */

;(function( $ ){

 /* DATATABLE CLASS DEFINITION
  * ========================== */
  var DataTable = function ( element, options ) {
    this.$element = $(element);
    this.options = options;
    this.enabled = true;
    this.columns = [];
    this.rows = [];

    // set the defaults for the column options array
    for(column in this.options.columns) {
      // check sortable
      if(typeof(this.options.columns[column].sortable) === undefined) 
        this.options.columns[column].sortable = true;
    }

    this.$default = this.$element.children().length ? 
      this.$element.children() : 
      $("<div></div>")
        .addClass("alert alert-error")
        .html("No Results Found")

    this.render();
  };

  DataTable.prototype = {

      constructor: DataTable

    , render: function () {
        var o = this.options
          , $e = this.$element

        // reset the columns and rows
        this.columns = []
        this.rows    = []
        this.$table  = undefined
        this.$header = undefined
        this.$body   = undefined
        this.$footer = undefined
        this.$pagination = undefined

        // top
        this.$top_details = $("<div></div>")
          .attr("id", "dt-top-details")
        // bottom
        this.$bottom_details = $("<div></div>")
          .attr("id", "dt-bottom-details")

        // localize the object
        var that = this;

        // pull in the data from the ajax call
        if(o.url != "") {
          $.ajax({
              url: o.url
            , type: "POST"
            , dataType: "json"
            , data: {
                  currentPage: o.currentPage
                , perPage: o.perPage
                , sort: o.sort
                , filter: o.filter
              }
            , success: function( res ) {
                that.resultset = res;

                if(res.data.length == 0) {
                  if(that.$default) {
                    $e.empty();
                    $e.html(that.$default);
                  }
                  return;
                }

                // clear out the current elements in the container
                $e.empty();

                // set the sort and filter configuration
                o.sort = res.sort
                o.filter = res.filter

                // set the current page if we're forcing it from the server
                if(res.currentPage) o.currentPage = parseInt(res.currentPage);

                // append the table
                $e.append(that.table());

                // append the detail boxes
                $e.prepend(that.$top_details)
                $e.append(that.$bottom_details)

                // render the rest of the table
                if(o.showHeader)        that.header();
                if(o.showFooter)        that.footer();

                // fill in the table body
                that.body();

                // render the pagination              
                if(o.showTopPagination && that.pagination()) 
                  that.$top_details.append(that.pagination().clone(true));
                if(o.showPagination && that.pagination())    
                  that.$bottom_details.append(that.pagination().clone(true));

                // handle the column management
                if(o.toggleColumns)   initModal.call(that);
              }
            , error: function( e ) {
                if(o.debug) console.log(e);
                showError.call(that);
              }
          })     
        }
      }

    , table: function () {
        var $e = this.$element

        if (!this.$table) {
          this.$table = $('<table></table>')
            .addClass("table table-striped")

          $e.html(this.$table);
        }
        return this.$table;
      }

    , header: function () {
        var o = this.options
          , res = this.resultset

        if(!this.$header) {
          this.$header = $('<thead></thead>')

          // loop through the columns
          for(column in o.columns) {
            var $cell = this.column(column)

            // attach the sort click event
            if(o.columns[column].sortable && !o.columns[column].custom)
              $cell.click(this, this.sort)
                .css({'cursor':'pointer'})

            for(var i = 0; i < o.sort.length; i++) {
              if(o.sort[i][0] == o.columns[column].field) {            
                if(o.sort[i][1] == "asc")
                  $cell.append($(o.ascending))
                else if(o.sort[i][1] == "desc")
                  $cell.append($(o.descending))
              }
            }

            this.$header.append($cell);
            this.columns.push($cell);
          }

          this.table()
            .append(this.$header);
        }
        return this.$header;
      }

    , footer: function () {
        var res = this.resultset

        if(!this.$footer) {
          this.$footer = $('<tfoot></tfoot>')

          this.table()
            .append(this.$footer);
        }
        return this.$footer;
      }

    , body: function () {
        var res = this.resultset
          , o = this.options

        if(!this.$body) {
          this.$body = $('<tbody></tbody>')

          // loop through the results
          for(var i = 0; i < res.data.length; i++) {
            var row = this.row(res.data[i]);
            this.$body.append(row);
            this.rows.push(row);
          }

          if(o.showFilter) this.$body.prepend(this.filter());

          this.table()
            .append(this.$body);
        }
        return this.$body;
      }

    , filter: function () {
        var $row = $("<tr></tr>")
          , o = this.options
          , that = this

        $row.addClass("dt-filter-row");

        // loop through the columns
        for(column in o.columns) {
          var $cell = $("<td></td>")
            .addClass("dt-column_" + column)

          if(o.columns[column].hidden) $cell.hide();

          if(o.columns[column].filter && o.columns[column].field) {
            $cell
              .append(
                $("<input/>")
                  .attr("name", "filter_" + o.columns[column].field)
                  .data("filter", o.columns[column].field)
                  .val(o.filter[o.columns[column].field] || "")
                  // .change(this, this.runFilter)
                  .change(function(e){
                    runFilter.call(this, that)
                  })
              )
          }

          $row.append($cell);
        }
        return $row;
      }

    , row: function ( rowdata ) {
        var $row = $("<tr></tr>")
          , o = this.options

        // loop through the columns
        for(column in o.columns) {
          var cell = this.cell( rowdata, column );
          $row.append(cell);
        }

        // callback for postprocessing on the row
        if(o.rowCallback && typeof(o.rowCallback) === "function") 
          $row = o.rowCallback( $row );

        return $row;
      }

    , cell: function ( data, column ) {
        var celldata = data[this.options.columns[column].field] || this.options.columns[column].custom
          , $cell = $('<td></td>')
          , o = this.options

        // preprocess on the cell data for a column
        if(o.columns[column].callback && typeof(o.columns[column].callback) === "function") 
          celldata = o.columns[column].callback( data, o.columns[column] )

        $cell
          .data("cell_properties", o.columns[column])
          .addClass("dt-column_" + column)
          .html(celldata || "&nbsp;")

        if(o.columns[column].hidden) $cell.hide();

        return $cell;
      }

    , column: function ( column ) {
        var $cell = $('<th></th>')
          , o = this.options

        $cell
          .data("column_properties", o.columns[column])
          .addClass("dt-column_" + column)
          .text(o.columns[column].title)

        if(o.columns[column].hidden) $cell.hide();

        return $cell;
      }

    , sort: function ( e ) {
        var colprop = $(this).data("column_properties")
          , $d = e.data
          , o = e.data.options
          , found = false

        colprop.sortOrder = colprop.sortOrder ? (colprop.sortOrder == "asc" ? "desc" : "") : "asc";

        // does the sort already exist?
        for(var i = 0; i < o.sort.length; i++) {
          if(o.sort[i][0] == colprop.field) {
            o.sort[i][1] = colprop.sortOrder;
            if(colprop.sortOrder == "") o.sort.splice(i,1)
            found = true
          }
        }
        if(!found) o.sort.push([colprop.field, colprop.sortOrder])

        $d.render();
      }

    , pagination: function () {
        var $e = this.$element
          , $d = this
          , o = this.options
          , res = this.resultset

        // no paging needed
        if(o.perPage >= res.totalRows) return;

        if(!this.$pagination) {
          this.$pagination = $("<div></div>")
            .addClass("pagination pagination-right")

          // how many pages?
          o.pageCount = Math.ceil(res.totalRows / o.perPage)

          // setup the pager container and the quick page buttons
          var $pager = $("<ul></ul>")
            , $first = $("<li></li>").append(
                $("<a></a>")
                  .attr("href", "#")
                  .data("page", 1)
                  .text("First")
                  .click(function() {
                    o.currentPage = 1
                    $d.render();
                  })
              )
            , $previous = $("<li></li>").append(
                $("<a></a>")
                  .attr("href", "#")
                  .data("page", o.currentPage - 1)
                  .text("Prev")
                  .click(function() {
                    o.currentPage -= 1
                    $d.render();
                  })
              )
            , $next = $("<li></li>").append(
                $("<a></a>")
                  .attr("href", "#")
                  .data("page", o.currentPage + 1)
                  .text("Next")
                  .click(function() {
                    o.currentPage += 1
                    $d.render();
                  })
              )
            , $last = $("<li></li>").append(
                $("<a></a>")
                  .attr("href", "#")
                  .data("page", o.pageCount)
                  .text("Last")
                  .click(function() {
                    o.currentPage = o.pageCount
                    $d.render();
                  })
              )


          var totalPages = o.pagePadding * 2
            , start
            , end

          if(totalPages >= o.pageCount) {
            start = 1
            end = o.pageCount
          }
          else {
            start = o.currentPage - o.pagePadding
            if(start <= 0) start = 1

            end = start + totalPages
            if(end > o.pageCount) {
              end = o.pageCount
              start = end - totalPages
            }
          }

          // append the pagination links
          for(var i = start; i <= end; i++) {
            var $link = $("<li></li>")
              .append(
                $("<a></a>")
                  .attr("href", "#")
                  .data("page", i)
                  .text(i)
                  .click(function() {
                    o.currentPage = $(this).data('page')
                    $d.render();
                  })
              )

              if(i == o.currentPage) $link.addClass("active")

              $pager.append($link);
          }

          // append quick jump buttons
          if(o.currentPage == 1) {
            $first.addClass("disabled")
            $previous.addClass("disabled")
          }
          if(o.currentPage == o.pageCount) {
            $next.addClass("disabled")
            $last.addClass("disabled")
          }
          $pager.prepend($first, $previous);
          $pager.append($next, $last);

          this.$pagination.append($pager);
        }
        return this.$pagination;
      }

  };


 /* DATATABLE PRIVATE METHODS
  * ========================= */

  function showError() {
    var o = this.options
      , $e = this.$element

    $e.empty();
    if(this.$default) $e.append(this.$default);
  }

  function runFilter(that) {
    var o = that.options

    o.filter[$(this).data("filter")] = $(this).val();

    that.render();
  }

  function initModal() {
    var o = this.options
      , $e = this.$element
      , $bottom_details = this.$bottom_details
      , $toggle = $("<a></a>")

    // localize the object
    var that = this;

    if(!this.$modal) {
      this.$modal = $('<div></div>')
        .attr("id", "dt-column-modal") // TODO: need to adjust to allow multiple tables on a page
        .addClass("modal")
        .hide()

      // render the modal header
      this.$modalheader = $("<div></div>")
        .addClass("modal-header")
        .append(
          $("<button></button>")
            .addClass("close")
            .data("dismiss", "modal")
            .text('x')
            .click(function(){
              that.$modal.modal('hide')
            })
        )
        .append(
          $("<h3></h3>")
            .text("Toggle Columns")
        )

      // render the modal footer
      this.$modalfooter = $("<div></div>")
        .addClass("modal-footer")
        .append(
          $("<a></a>")
            .attr("href", "#")
            .addClass("btn btn-primary")
            .text("Save")
            .click(function(){
              saveColumns.call(that)
            })
        )

      // render the modal body
      this.$modalbody = $("<div></div>")
        .addClass("modal-body")

      // render and add the modal to the container
      this.$modal
        .append(
            this.$modalheader
          , this.$modalbody
          , this.$modalfooter
        )
        .appendTo(document.body);
    }

    // render the display modal button
    $toggle
      .addClass("btn pull-left")
      .data("toggle", "modal")
      .attr("href", "#dt-column-modal")
      .html("<i class=\"icon-cog\"></i>")
      .click(function(){
        that.$modal
          .on('show', function () {
            _updateColumnModalBody.call(that, that.$modalbody)
          })
          .modal();
      })
    $bottom_details.prepend($toggle);

    return this.$modal;
  }

  function _updateColumnModalBody(body) {
    var o = this.options
      , $container = $("<fieldset></fieldset>")
      , that = this

    // loop through the columns
    for(column in o.columns) {
      var $item = $('<div class="control-group" style="float: left" data-column="' + column + '"><label class="control-label">' + o.columns[column].title + '</label><div class="controls"><div class="btn-group" data-toggle="buttons-radio"><a href="#" class="btn ' + (o.columns[column].hidden ? "" : "active") + '"><i class="icon-ok"></i></a><a href="#" class="btn ' + (o.columns[column].hidden ? "active" : "") + '"><i class="icon-remove"></i></a></div></div></div>')
        .click(function() {
          _toggleColumn.call(this, that)
        })

      $container.append($item);
    }

    body.empty()
    body.append(
      $("<form></form>")
        .addClass("form-horizontal")
        .append($container)
    )
  }

  function _toggleColumn(that) {
    var o = that.options
      , column = $(this).data("column")
      , $column = $(".dt-column_" + column)

    if($column.is(":visible")) {
      $column.hide()
      o.columns[column].hidden = true;
    }
    else {
      $column.show()
      o.columns[column].hidden = false;
    }

    $(this).find(".active").removeClass("active")
    o.columns[column].hidden ? 
      $(this).find(".icon-remove").parent().addClass("active") :
      $(this).find(".icon-ok").parent().addClass("active")
  }

  function saveColumns() {
    var o = this.options
      , columns = []

    // save the columns to the localstorage
    if(localStorage) {
      localStorage["datatable_" + o.url.replace(/\W/ig, '_')] = o.columns
    }

    $.ajax({
        url: o.url
      , type: "POST"
      , dataType: "json"
      , data: {
            action: "saveColumns"
          , columns: JSON.stringify(o.columns)
          , sort: JSON.stringify(o.sort)
          , filter: JSON.stringify(o.filter)
        }
      , success: function( res ) {
          console.log("columns saved")
        }
    })

    this.$modal.modal("hide")
  }


 /* DATATABLE PLUGIN DEFINITION
  * =========================== */

  $.fn.datatable = function ( options ) {
    $.fn.datatable.init.call(this, options, DataTable, 'datatable');
    return this;
  };

  $.fn.datatable.init = function ( options, Constructor, name ) {
    var datatable

    if (options === true) {
      return this.data(name);
    } else if (typeof options == 'string') {
      datatable = this.data(name);
      if (datatable) {
        datatable[options]();
      }
      return this;
    }

    options = $.extend({}, $.fn[name].defaults, options);

    function get ( el ) {
      var datatable = $.data(el, name);

      if (!datatable) {
        datatable = new Constructor(el, $.fn.datatable.elementOptions(el, options));
        $.data(el, name, datatable);
      }

      return datatable;
    };

    this.each(function() {
      get(this);
    });

    return this;
  };

  $.fn.datatable.DataTable = DataTable;

  $.fn.datatable.elementOptions = function ( el, options ) {
    return $.metadata ? $.extend({}, options, $(el).metadata()) : options
  };

  $.fn.datatable.defaults = {
    debug: false
  , perPage: 10
  , pagePadding: 2
  , sort: [[]]
  , filter: {}
  , totalRows: 0
  , currentPage: 1
  , showPagination: false
  , showTopPagination: false
  , showHeader: true
  , showFooter: false
  , showFilter: false
  , allowExport: false
  , toggleColumns: true
  , url: 'data.php'
  , columns: []
  , ascending: '<i class="icon-chevron-up"></i>'
  , descending: '<i class="icon-chevron-down"></i>'
  , rowCallback: undefined
  };


})(window.jQuery);