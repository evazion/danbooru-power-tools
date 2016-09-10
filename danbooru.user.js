// ==UserScript==
// @name         Danbooru EX
// @namespace    https://github.com/evazion/danbooru-ex
// @version      130
// @source       https://danbooru.donmai.us/users/52664
// @description  Danbooru UI Enhancements
// @author       evazion
// @match        *://*.donmai.us/*
// @grant        none
// @updateURL    https://github.com/evazion/danbooru-ex/raw/master/danbooru.user.js
// @downloadURL  https://github.com/evazion/danbooru-ex/raw/master/danbooru.user.js
// @require      https://raw.githubusercontent.com/jquery/jquery-ui/16a3e63a7108dc7da34d7d52b4fccd9ada24308c/ui/selectable.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.14.1/moment.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.15.0/lodash.js
// ==/UserScript==

// @require      https://raw.githubusercontent.com/imgix/drift/master/dist/Drift.js
// @resource     css https://raw.githubusercontent.com/imgix/drift/master/dist/drift-basic.css

/*
 * What is a userscript? A miserable pile of hacks.
 */

$(function() {
    'use strict';

    const stylesheet = $(`
        <style>
            #sticky-header {
                position: fixed;
                display: flex;
                width: 100%;
                background: white;
                z-index: 100;
            }

            #sticky-header h1 {
                display: inline-block;
                font-size: 2.5em;
                margin: 0 30px;
                //padding: 42px 0px 0px 0px;
            }

            #sticky-header #search-box {
                display: inline-block;
                margin: auto 30px;
            }

            #sticky-header #search-box #tags {
                width: 640px;
            }

            #sticky-header #mode-box {
                margin: auto 30px;
            }

            #sticky-header #mode-box form {
                display: inline-block;
            }

            #sticky-header #mode-box form #tag-script-field {
                margin-top: 0;
            }


            #notice {
                top: 4.5em !important;
            }

            #top {
                padding-top: 52px;
            }

            #top h1 {
                display: none;
            }



            #wiki-page-body h1, #wiki-page-body h2, #wiki-page-body h3, 
            #wiki-page-body h4, #wiki-page-body h5, #wiki-page-body h6 {
                //display: flex;
                //align-items: center;
                padding-top: 52px;
                margin-top: -52px;
            }

            #wiki-page-body a.ui-icon.collapsible-header {
                display: inline-block;
                margin-left: -8px;
            }



            .ui-selected {
                background: lightblue;
            }

            .ui-selectable {
                -ms-touch-action: none;
                touch-action: none;
            }

            .ui-selectable-helper{
                position: absolute;
                z-index: 100;
                border: 1px dotted black;
            }

            /*
            .user-member::before, .user-gold::before,
            .user-platinum::before, .user-builder::before,
            .user-janitor::before, .user-moderator::before,
            .user-admin::before {
                content: '@';
                color: grey;
            }
            */

            /*
            .paginator {
                clear: none !important;
            }
            */
        </style>
    `).appendTo("head");

    /*
     * Extensions to Danbooru's JS API.
     */

    Danbooru.Dtext.create_expandable = function (name, content) {
        const $expandable = $(`
            <div class="expandable">
                <div class="expandable-header">
                    <span>${_.escape(name)}</span>
                    <input type="button" value="Show" class="expandable-button">
                </div>
                <div class="expandable-content" style="display: none">
                    ${content}
                </div>
            </div>
        `);

        $expandable.find('.expandable-button').click(e => {
            $(e.target).closest('.expandable').find('.expandable-content').fadeToggle('fast');
            $(e.target).val((_, val) => val === 'Show' ? 'Hide' : 'Show');
        });

        return $expandable;
    };

    /* Generate the post thumbnail HTML. */
    Danbooru.Post.preview = function (post) {
        let preview_class = "post-preview";

        preview_class += post.is_pending           ? " post-status-pending"      : "";
        preview_class += post.is_flagged           ? " post-status-flagged"      : "";
        preview_class += post.is_deleted           ? " post-status-deleted"      : "";
        preview_class += post.parent_id            ? " post-status-has-parent"   : "";
        preview_class += post.has_visible_children ? " post-status-has-children" : "";

        const data_attributes = `
            data-id="${post.id}"
            data-has-sound="${!!post.tag_string.match(/(video_with_sound|flash_with_sound)/)}"
            data-tags="${_.escape(post.tag_string)}"
            data-pools="${post.pool_string}"
            data-uploader="${_.escape(post.uploader_name)}"
            data-approver-id="${post.approver_id}"
            data-rating="${post.rating}"
            data-width="${post.image_width}"
            data-height="${post.image_height}"
            data-flags="${post.status_flags}"
            data-parent-id="${post.parent_id}"
            data-has-children="${post.has_children}"
            data-score="${post.score}"
            data-views="${post.view_count}"
            data-fav-count="${post.fav_count}"
            data-pixiv-id="${post.pixiv_id}"
            data-md5="${post.md5}"
            data-file-ext="${post.file_ext}"
            data-file-url="${post.file_url}"
            data-large-file-url="${post.large_file_url}"
            data-preview-file-url="${post.preview_file_url}"
        `;

        const tag_params = "";

        return `
            <article itemscope itemtype="http://schema.org/ImageObject"
                     id="post_${post.id}" class="${preview_class}" ${data_attributes}>
                <a href="/posts/${post.id}${tag_params}">
                    <img itemprop="thumbnailUrl"
                         src="${post.preview_file_url}"
                         alt="${_.escape(post.tag_string)}">
                </a>
            </article>
        `;
    };

    /* Go to page N. */
    Danbooru.Paginator.goto = function (n) {
        if (location.search.match(/page=(\d+)/)) {
            location.search = location.search.replace(/page=(\d+)/, `page=${n}`);
        } else {
            location.search += `&page=${n}`;
        }
    };

    /* Apply current mode to all selected posts. */
    Danbooru.PostModeMenu.apply_mode = function (e) {
        $(".ui-selected").each(function (i, e) {
            var s = $("#mode-box select").val();
            var post_id = $(e).data('id');

            if (s === "add-fav") {
                Danbooru.Favorite.create(post_id);
            } else if (s === "remove-fav") {
                Danbooru.Favorite.destroy(post_id);
            } else if (s === "edit") {
                Danbooru.PostModeMenu.open_edit(post_id);
            } else if (s === 'vote-down') {
                Danbooru.Post.vote("down", post_id);
            } else if (s === 'vote-up') {
                Danbooru.Post.vote("up", post_id);
            } else if (s === 'rating-q') {
                Danbooru.Post.update(post_id, {"post[rating]": "q"});
            } else if (s === 'rating-s') {
                Danbooru.Post.update(post_id, {"post[rating]": "s"});
            } else if (s === 'rating-e') {
                Danbooru.Post.update(post_id, {"post[rating]": "e"});
            } else if (s === 'lock-rating') {
                Danbooru.Post.update(post_id, {"post[is_rating_locked]": "1"});
            } else if (s === 'lock-note') {
                Danbooru.Post.update(post_id, {"post[is_note_locked]": "1"});
            } else if (s === 'approve') {
                Danbooru.Post.approve(post_id);
            } else if (s === "tag-script") {
                var current_script_id = Danbooru.Cookie.get("current_tag_script_id");
                var tag_script = Danbooru.Cookie.get("tag-script-" + current_script_id);
                Danbooru.TagScript.run(post_id, tag_script);
            } else {
                return;
            }
        });

        e.preventDefault();
    };

    /* Toggle post selection between all or none. */
    Danbooru.PostModeMenu.select_all = function (e) {
        if ($('.ui-selected').length) {
            $('.ui-selected').removeClass('ui-selected');
        } else {
            $('.post-preview').addClass('ui-selected');
        }

        e.preventDefault();
    };

    /*
     * Monkey patches for Danbooru's JS API.
     */

    /* Display the new tag script in the popup notice when switching tag scripts. */
    Danbooru.PostModeMenu.show_notice = function (i) {
        let current_script_id = Danbooru.Cookie.get("current_tag_script_id");
        let tag_script = Danbooru.Cookie.get(`tag-script-${current_script_id}`).trim();
        if (tag_script) {
            Danbooru.notice(`Switched to tag script #${i}: <a href="/posts?tags=${encodeURIComponent(tag_script)}">${tag_script}</a>. To switch tag scripts, use the number keys.`);
        } else {
            Danbooru.notice(`Switched to tag script #${i}. To switch tag scripts, use the number keys.`);
        }
    };

    /* Update Rating in sidebar when it changes. */
    var old_update_data = Danbooru.Post.update_data;
    Danbooru.Post.update_data = function(data) {
        var rating = data.rating === 's' ? "Safe"
                   : data.rating === 'q' ? "Questionable"
                   : data.rating === 'e' ? "Explicit"
                   : "Unknown";

        $("#post-information > ul > li:nth-child(6)").text(`Rating: ${rating}`);
        return old_update_data(data);
    };

    /* Disable middle-click for on clicking related tag. */
    const old_toggle_tag = Danbooru.RelatedTag.toggle_tag;
    Danbooru.RelatedTag.toggle_tag = function (e) {
        if (e.which === 1) {
            return old_toggle_tag(e);
        }
    }

    const old_postmodemenu_change = Danbooru.PostModeMenu.change;
    Danbooru.PostModeMenu.change = function () {
        const mode = $("#mode-box select").val();

        if (mode !== "view") {
            /* Disable middle-click for tag scripts. */
            $("article.post-preview a").off("click").click(function (e) {
                console.log(e);
                if (e.which == 1) {
                    return Danbooru.PostModeMenu.click(e);
                }
            });

            /* Enable selectable thumbnails. */
            $("#page").selectable({
                filter: "article.post-preview",
                delay: 300
            });
        }

        return old_postmodemenu_change();
    };

    /*
     * Global tweaks.
     */

    /*
     * Use relative times everywhere.
     */
    const ABS_DATE = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
    const abs_dates = $('time').filter((i, e) => $(e).text().match(ABS_DATE));

    abs_dates.each((i, e) => {
        const time_ago = moment($(e).attr('datetime')).fromNow();
        $(e).text(time_ago);
    });

    /*
     * Add sticky header.
     */

    var $sticky = $(`
        <header id="sticky-header">
            <h1><a href="/">Danbooru</a></h1>
            <form id="search-box" action="/posts" accept-charset="UTF-8" method="get">
                <input name="utf8" type="hidden" value="✓">
                <input type="text" name="tags" id="tags" size="20" class="ui-autocomplete-input" autocomplete="off">
                <input type="submit" value="Go">
            </form>
            <section id="mode-box">
                <form action="/">
                    <select name="mode">
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="tag-script">Tag script</option>
                        <option value="add-fav">Favorite</option>
                        <option value="remove-fav">Unfavorite</option>
                        <option value="rating-s">Rate safe</option>
                        <option value="rating-q">Rate questionable</option>
                        <option value="rating-e">Rate explicit</option>
                        <option value="vote-up">Vote up</option>
                        <option value="vote-down">Vote down</option>
                        <option value="lock-rating">Lock rating</option>
                        <option value="lock-note">Lock notes</option>
                    </select>
                </form>
                <input id="tag-script-field" placeholder="Enter tag script" style="display: none; margin-top: 0.5em;">
                <button type="button">Apply</button>
            </section>
        </header>
    `).insertBefore("#top");

    // Initalize sticky header search box.
    $("#sticky-header #tags").val($("#sidebar #tags").val());

    // $("#search-box").remove();

    /*
     * Use the mode menu everywhere *but* on /posts/show (so as to not
     * interfere with existing keyboard shortcuts on that page).
     */
    if (! ($("#c-posts").length && $("#a-show").length)) {
        Danbooru.PostModeMenu.initialize_selector();
        Danbooru.PostModeMenu.initialize_preview_link();
        Danbooru.PostModeMenu.initialize_edit_form();
        Danbooru.PostModeMenu.initialize_tag_script_field();
        Danbooru.PostModeMenu.initialize_shortcuts();
        Danbooru.PostModeMenu.change();

        $('#sticky-header .mode-box button').click(Danbooru.PostModeMenu.apply_mode);

        $(document).bind('keydown', 'ctrl+a',  Danbooru.PostModeMenu.select_all);
        $(document).bind('keydown', 'shift+a', Danbooru.PostModeMenu.apply_mode);

        const keys = {
            "v":     "view",
            "t":     "tag-script",
            "e":     "edit",
            "f":     "add-fav",
            "alt+f": "remove-fav",

            "alt+s": "rating-s",
            "alt+q": "rating-q",
            "alt+e": "rating-e",

            "u":     "vote-up",
            "alt+u": "vote-down",
        };

        $.each(keys, function (key, mode) {
            $(document).keydown(key, function (e) {
                const prev_mode = $("#mode-box select").val();
                $("#mode-box select").val(mode);

                if (mode === "tag-script") {
                    let $tag_script_field = $("#tag-script-field").first();
                    console.log($tag_script_field);

                    /* Focus and select all in tag script entry box. */
                    if (prev_mode === "tag-script") {
                        $tag_script_field.focus().selectRange(0, $tag_script_field.val().length);
                        $tag_script_field.focus();
                    }
                    /*
                    if ($tag_script_field.val().length) {
                        $tag_script_field.val((i, v) => v.replace(/\s*$/, ' '));
                    }
                    */
                }

                Danbooru.notice(`Switched to ${mode} mode.`);
                Danbooru.PostModeMenu.change();

                e.preventDefault();
            });
        });
    }

    /*
     * /posts/show tweaks
     */

    if ($("#c-posts").length && $("#a-show").length) {
        let post_id = Danbooru.meta("post-id");

        let rate = function (post_id, rating) {
            return function (e) {
                Danbooru.Post.update(post_id, {"post[rating]": rating});
                e.preventDefault();
            };
        };

        $(document).keydown("alt+s", rate(post_id, 's'));
        $(document).keydown("alt+q", rate(post_id, 'q'));
        $(document).keydown("alt+e", rate(post_id, 'e'));

        $(document).keydown("u",     e => Danbooru.Post.vote('up',   post_id));
        $(document).keydown("alt+u", e => Danbooru.Post.vote('down', post_id));
    }

    /*
     * /post_versions tweaks.
     */

    /* Show thumbnails in post changes listing. */
    if ($("#c-post-versions").length && $("#a-index").length) {
        let $post_column = $('tr td:nth-child(1)');
        let post_ids = $.map($post_column, e => $(e).text().match(/(\d+).\d+/)[1] );

        let post_data = [];
        let requests = _.chunk(post_ids, 100).map(function (ids) {
            let search = 'id:' + ids.join(',');

            console.log(`/posts.json?tags=${search}`);
            return $.get(`/posts.json?tags=${search}`).then(data => {
                data.forEach((post, i) => post_data[post.id] = post);
            });
        });

        console.log('requests', requests);
        Promise.all(requests).then(_ => {
            console.log('post_data', post_data);
            $post_column.each((i, e) => {
                let post_id = $(e).text().match(/(\d+).\d+/)[1];
                $(e).html(Danbooru.Post.preview(post_data[post_id]));
            });
        });
    }

    /*
     * Add 'comment #1234' permalink to comments on posts and in comment index.
     */
    if ($("#c-comments").length || ($("#c-posts").length && $("#a-show").length)) {
        $('.comment').each((i, e) => {
            const post_id    = $(e).data('post-id');
            const comment_id = $(e).data('comment-id');

            $(e).find('menu').append($(`
                <li> | </li>
                <li>
                    <a href="/posts/${post_id}#comment-${comment_id}">Comment #${comment_id}</a>
                </li>
            `));
        });
    }

    /*
     * /forum_topics tweaks.
     */

    if ($("#c-forum-topics").length && $("#a-show").length) {
        /* On forum posts, change "Permalink" to "Forum #1234". */
        $(".forum-post menu").each(function (i, e) {
            let $forum_id  = $(e).find("li:nth-child(1)");
            let $quote     = $(e).find("li:nth-child(2)");
            let $permalink = $(e).find("li:last-child");

            $permalink.find("a").text(`Forum #${$forum_id.text().match(/\d+/)}`);
            $permalink.before($("<li>").text("|"));

            $forum_id.remove();
        });
    }

    /*
     * /wiki_pages tweaks.
     */

    if ($("#c-wiki-pages").length) {
        const $headings = $("#wiki-page-body").find('h1,h2,h3,h4,h5,h6');

        console.log($headings);
        if ($headings.length >= 3) {
            /* Add collapse/expand button to headings. */
            $headings.prepend(
                $('<a class="ui-icon ui-icon-triangle-1-s collapsible-header"></a>')
            ).click(e => {
                const $button = $(e.target);

                $button.toggleClass('ui-icon-triangle-1-e ui-icon-triangle-1-s');
                $button.parent('h1').nextUntil('h1').slideToggle();
                $button.parent('h2').nextUntil('h1, h2').slideToggle();
                $button.parent('h3').nextUntil('h1, h2, h3').slideToggle();
                $button.parent('h4').nextUntil('h1, h2, h3, h4').slideToggle();
                $button.parent('h5').nextUntil('h1, h2, h3, h4, h5').slideToggle();
                $button.parent('h6').nextUntil('h1, h2, h3, h4, h5, h6').slideToggle();
            });

            /* Add Table of Contents expandable and link entries to headings. */
            const $toc = Danbooru.Dtext.create_expandable('Table of Contents', '<ul></ul>').prependTo('#wiki-page-body');
            console.log($toc);

            var $ul;
            let $menu = $toc.find('ul');
            let level = $headings.length > 0 ? parseInt($headings.first().get(0).tagName[1]) : undefined;

            $headings.each((i, e) => {
                const header = $(e).text();
                const anchor = 'dtext-' + header.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/, '');

                const next_level = parseInt(e.tagName[1]);
                if (next_level > level) {
                    $ul = $('<ul></ul>');
                    $menu.append($ul);
                    $menu = $ul;
                } else if (next_level < level) {
                    $menu = $menu.parent();
                }

                $(e).attr('id', anchor);
                $menu.append($(`<li><a href="#${anchor}">${header}</a></li>`));

                level = next_level;
            });
        }
    }

    /*
     * Global keybindings.
     */

    /* Escape: Close notice popups. */
    $(document).keydown('esc', e => $('#close-notice-link').click());

    /* Escape: Unfocus text entry field. */
    $('#tag-script-field').attr('type', 'text');
    $('input[type=text],textarea').keydown('esc', e => $(e.currentTarget).blur());

    let scroll = (direction, duration, distance) => 
        _.throttle(() => {
            const top = $(window).scrollTop() + direction * $(window).height() * distance;
            $('html, body').animate({scrollTop: top}, duration, "linear");
        }, duration);
    /*
    Danbooru.Shortcuts.nav_scroll_down =
        () => Danbooru.scroll_to($(window).scrollTop() + $(window).height() * 0.15);
    Danbooru.Shortcuts.nav_scroll_up =
        () => Danbooru.scroll_to($(window).scrollTop() - $(window).height() * 0.15);
    */

    /* Enable smooth scrolling with W/D keys. */
    Danbooru.Shortcuts.nav_scroll_down = scroll(+1, 50, 0.06);
    Danbooru.Shortcuts.nav_scroll_up   = scroll(-1, 50, 0.06);

    /* Q: Focus search box. */
    /* XXX: Doesn't override site keybinding. */
    /*
    $(document).keydown("keydown", "q", e => {
        let $input = $("#tags, #search_name, #search_name_matches, #query").first();
        console.log($input);

        // Add a space to end if box is non-empty and doesn't already have trailing space.
        $input.val().length && $input.val((i, v) => v.replace(/\s*$/, ' '));
        $input.first().trigger("focus").selectEnd();

        e.preventDefault();
    });
    */

    /* Shift+Q: Focus and select all in search box. */
    $(document).keydown('shift+q', e => {
        let $input = $("#tags, #search_name, #search_name_matches, #query").first();

        // Add a space to end if  box is non-empty and doesn't already have trailing space.
        $input.val().length && $input.val((i, v) => v.replace(/\s*$/, ' '));
        $input.focus().selectRange(0, $input.val().length);

        e.preventDefault();
    });

    /*
     * Global paginator tweaks.
     */

    if ($(".paginator").length) {
        // Add paginator above results.
        // $('.paginator').clone().insertBefore('#post-sections');

        /* Shift+1..9: Jump to page N. */
        [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(n =>
            $(document).keydown(`shift+${n}`, e => {
                Danbooru.Paginator.goto(n);
                e.preventDefault();
            })
        );

        /* Shift+0: Switch to last page if there is one. */
        $(document).keydown(`shift+0`, e => {
            // a:not(a[rel]) - exclude the Previous/Next links seen in the paginator on /favorites et al.
            const last_page =
                $('div.paginator li:nth-last-child(2) a:not(a[rel])').first().text();

            if (last_page) {
                Danbooru.Paginator.goto(last_page);
            }

            e.preventDefault();
        });
    }
});
